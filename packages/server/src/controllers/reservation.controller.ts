import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/db.js';
import { createIdempotentReservation } from '../lib/reservation-idempotency.js';

// Reject impossible dates instead of allowing JavaScript to normalize them.
const reservationDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');

// Validate calendar components before using the runtime parser for supported time/offset syntax.
const queryDate = z.string().refine((value) => {
  const text = value.trim();
  const yearFirst = text.match(/^(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})(?=$|[Tt\s])/);
  const monthFirst = text.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{4})(?=$|[Tt\s])/);
  const named = text.match(/^(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?(?:([a-z]+)[\s/-]+(\d{1,2})(?:,\s*|[\s/-]+)(\d{4})|(\d{1,2})[\s/-]+([a-z]+)(?:,\s*|[\s/-]+)(\d{4})|(\d{4})[\s/-]+([a-z]+)[\s/-]+(\d{1,2}))(?=$|[Tt\s])/i);
  let year: number, month: number, day: number;
  if (yearFirst) {
    [, year, month, day] = yearFirst.map(Number);
  } else if (monthFirst) {
    [, month, day, year] = monthFirst.map(Number);
  } else if (named) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthName = named[1] || named[5] || named[8];
    month = months.indexOf(monthName.slice(0, 3).toLowerCase()) + 1;
    day = Number(named[2] || named[4] || named[9]);
    year = Number(named[3] || named[6] || named[7]);
  } else {
    return false;
  }
  // Legacy runtime parsing maps years below 100 to another century; accept only ISO syntax for them.
  if (year < 100 && !/^\d{4}-\d{2}-\d{2}(?:$|[Tt])/.test(text)) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && !Number.isNaN(new Date(text).getTime());
}, 'Invalid date filter');

const reservationTime = z.string().regex(/^\d{2}:\d{2}$/).refine((value) => {
  const hours = Number(value.slice(0, 2));
  const minutes = Number(value.slice(3, 5));
  return hours < 24 && minutes < 60;
}, 'Invalid clock time');

const createReservationSchema = z.object({
  locationId: z.string().min(1),
  date: reservationDate,
  time: reservationTime,
  partySize: z.number().int().min(1).max(50),
  comment: z.string().optional(),
});

const updateReservationSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED']).optional(),
  tableId: z.string().nullable().optional(),
  date: reservationDate.optional(),
  time: reservationTime.optional(),
  partySize: z.number().int().min(1).max(50).optional(),
  comment: z.string().nullable().optional(),
});

export async function createReservation(req: Request, res: Response): Promise<void> {
  const parsed = createReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues });
    return;
  }

  const key = req.get('Idempotency-Key');
  if (key !== undefined && !/^[A-Za-z0-9._~-]{1,128}$/.test(key)) {
    res.status(400).json({ success: false, error: 'Invalid idempotency key' });
    return;
  }
  const user = req.user;
  const customerId = user?.type === 'customer' ? user.id : null;
  const { locationId, date, time, partySize, comment } = parsed.data;
  if (key !== undefined && customerId) {
    const result = await createIdempotentReservation(customerId, key, { locationId, date, time, partySize, comment });
    if (result.kind === 'invalid' || result.kind === 'conflict') {
      res.status(result.kind === 'invalid' ? 400 : 409).json({ success: false, error: result.message });
      return;
    }
    if (result.kind === 'created') {
      try {
        const { appEvents } = await import('../lib/events.js');
        appEvents.emit('reservation.created', { reservation: result.data });
      } catch {}
    }
    res.status(201).json({ success: true, data: result.data });
    return;
  }

  if (date < new Date().toISOString().slice(0, 10)) {
    res.status(400).json({ success: false, error: 'Cannot reserve in the past' });
    return;
  }
  if (!customerId) {
    if (user) {
      res.status(400).json({ success: false, error: 'Reservations can only be created by a customer account' });
      return;
    }
    res.status(401).json({ success: false, error: 'Authentication required for reservations' });
    return;
  }
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location || !location.isActive) {
    res.status(400).json({ success: false, error: 'Location not found or inactive' });
    return;
  }
  const data = { customerId, locationId, date: new Date(date), time, partySize, comment };
  const include = { location: { select: { id: true, name: true } }, customer: { select: { id: true, name: true, email: true } }, table: true } as const;
  const reservation = await prisma.reservation.create({ data, include });

  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('reservation.created', { reservation });
  } catch {}
  res.status(201).json({ success: true, data: reservation });
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const { status, locationId, date } = req.query;

  if (status && !updateReservationSchema.shape.status.safeParse(status).success) {
    res.status(400).json({ success: false, error: 'Invalid status filter' });
    return;
  }
  if (locationId && typeof locationId !== 'string') {
    res.status(400).json({ success: false, error: 'Invalid locationId filter' });
    return;
  }
  if (date && !queryDate.safeParse(date).success) {
    res.status(400).json({ success: false, error: 'Invalid date filter' });
    return;
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (locationId) where.locationId = locationId;
  if (date) where.date = new Date(date as string);

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true, capacity: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true, capacity: true } },
    },
  });

  if (!reservation) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  // Customers may only read their own booking; staff may read any.
  const user = req.user;
  if (!user || (user.type !== 'staff' && reservation.customerId !== user.id)) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }

  res.json({ success: true, data: reservation });
}

// Proposed Issue #20 contract: completed and cancelled reservations release the slot.
const occupyingStatuses = ['PENDING', 'CONFIRMED', 'SEATED'] as const;
const allowedStatusTransitions: Record<string, readonly string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SEATED', 'CANCELLED'],
  SEATED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [],
};

export async function updateReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    // Serialize concurrent changes to the same reservation before reading its effective state.
    await tx.$queryRaw`SELECT "id" FROM "reservations" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.reservation.findUnique({ where: { id } });
    if (!existing) return { error: 'Reservation not found', status: 404 } as const;
    if (parsed.data.status !== undefined && parsed.data.status !== existing.status
      && !allowedStatusTransitions[existing.status].includes(parsed.data.status)) {
      return { error: 'Invalid reservation status transition', status: 409 } as const;
    }

    const effectiveTableId = parsed.data.tableId === undefined ? existing.tableId : parsed.data.tableId;
    const effectiveStatus = parsed.data.status ?? existing.status;
    const tableRelevantUpdate = parsed.data.tableId !== undefined || parsed.data.partySize !== undefined
      || parsed.data.date !== undefined || parsed.data.time !== undefined;
    const occupancyRelevantUpdate = parsed.data.tableId !== undefined || parsed.data.date !== undefined
      || parsed.data.time !== undefined || parsed.data.status !== undefined;

    // Every reservation writer in this path locks affected table rows in the same order.
    // This makes the subsequent conflict read and update atomic against competing requests.
    const affectedTableIds = [...new Set([existing.tableId, effectiveTableId].filter((value): value is string => value !== null))];
    if ((tableRelevantUpdate || occupancyRelevantUpdate) && affectedTableIds.length > 0) {
      await tx.$queryRaw`SELECT "id" FROM "tables" WHERE "id" IN (${Prisma.join(affectedTableIds)}) ORDER BY "id" FOR UPDATE`;
    }

    if (effectiveTableId !== null && tableRelevantUpdate) {
      const candidateTable = await tx.table.findFirst({
        where: {
          id: effectiveTableId,
          locationId: existing.locationId,
          isActive: true,
          capacity: { gte: parsed.data.partySize ?? existing.partySize },
        },
      });
      if (!candidateTable) return { error: 'Table is not eligible for this reservation', status: 400 } as const;
    }

    if (effectiveTableId !== null && occupancyRelevantUpdate && occupyingStatuses.some((status) => status === effectiveStatus)) {
      const conflict = await tx.reservation.findFirst({
        where: {
          id: { not: id },
          locationId: existing.locationId,
          tableId: effectiveTableId,
          date: parsed.data.date === undefined ? existing.date : new Date(parsed.data.date),
          time: parsed.data.time ?? existing.time,
          status: { in: [...occupyingStatuses] },
        },
        select: { id: true },
      });
      if (conflict) return { error: 'Table is already reserved for this slot', status: 409 } as const;
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.tableId !== undefined) data.tableId = parsed.data.tableId;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.time !== undefined) data.time = parsed.data.time;
    if (parsed.data.partySize !== undefined) data.partySize = parsed.data.partySize;
    if (parsed.data.comment !== undefined) data.comment = parsed.data.comment;

    const reservation = await tx.reservation.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true, capacity: true } },
      },
    });
    return { reservation } as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });

  if ('error' in result && result.status !== undefined) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }
  res.json({ success: true, data: result.reservation });
}

export async function deleteReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  await prisma.reservation.delete({ where: { id } });
  res.json({ success: true, message: 'Reservation deleted' });
}

export async function listCustomerReservations(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { customerId };

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      include: {
        location: { select: { id: true, name: true } },
        table: { select: { id: true, name: true, capacity: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  res.json({
    success: true,
    data: reservations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getReservationAnalytics(req: Request, res: Response): Promise<void> {
  const days = Math.min(365, Math.max(7, parseInt(req.query.days as string) || 30));
  const locationId = req.query.locationId as string | undefined;

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);
  endDate.setHours(23, 59, 59, 999);

  const locationFilter = locationId ? Prisma.sql`AND "locationId" = ${locationId}` : Prisma.empty;
  const where: Prisma.ReservationWhereInput = {
    date: { gte: startDate, lte: endDate },
    ...(locationId ? { locationId } : {}),
  };

  const [
    dailyRows,
    dowRows,
    partySizeRows,
    statusRows,
    hourlyRows,
    leadTimeRows,
    summaryAgg,
    completedCount,
  ] = await Promise.all([
    prisma.$queryRaw<{ date: string; reservations: bigint; guests: bigint }[]>(
      Prisma.sql`
        SELECT
          TO_CHAR("date", 'YYYY-MM-DD') AS date,
          COUNT(*)::bigint AS reservations,
          COALESCE(SUM("partySize"), 0)::bigint AS guests
        FROM "reservations"
        WHERE "date" >= ${startDate} AND "date" <= ${endDate} ${locationFilter}
        GROUP BY "date"
        ORDER BY "date"
      `
    ),
    prisma.$queryRaw<{ dow: number; reservations: bigint; guests: bigint }[]>(
      Prisma.sql`
        SELECT
          EXTRACT(DOW FROM "date")::int AS dow,
          COUNT(*)::bigint AS reservations,
          COALESCE(SUM("partySize"), 0)::bigint AS guests
        FROM "reservations"
        WHERE "date" >= ${startDate} AND "date" <= ${endDate} ${locationFilter}
        GROUP BY EXTRACT(DOW FROM "date")
        ORDER BY dow
      `
    ),
    prisma.reservation.groupBy({
      by: ['partySize'],
      where,
      _count: true,
      orderBy: { partySize: 'asc' },
    }),
    prisma.reservation.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.$queryRaw<{ hour: number; reservations: bigint }[]>(
      Prisma.sql`
        SELECT
          SPLIT_PART("time", ':', 1)::int AS hour,
          COUNT(*)::bigint AS reservations
        FROM "reservations"
        WHERE "date" >= ${startDate} AND "date" <= ${endDate} ${locationFilter}
        GROUP BY SPLIT_PART("time", ':', 1)::int
        ORDER BY hour
      `
    ),
    prisma.$queryRaw<{ bucket: string; count: bigint }[]>(
      Prisma.sql`
        SELECT
          CASE
            WHEN ("date"::date - "createdAt"::date) <= 0 THEN 'same-day'
            WHEN ("date"::date - "createdAt"::date) BETWEEN 1 AND 2 THEN '1-2d'
            WHEN ("date"::date - "createdAt"::date) BETWEEN 3 AND 7 THEN '3-7d'
            WHEN ("date"::date - "createdAt"::date) BETWEEN 8 AND 14 THEN '8-14d'
            ELSE '15d+'
          END AS bucket,
          COUNT(*)::bigint AS count
        FROM "reservations"
        WHERE "date" >= ${startDate} AND "date" <= ${endDate} ${locationFilter}
        GROUP BY bucket
      `
    ),
    prisma.reservation.aggregate({
      where,
      _count: true,
      _sum: { partySize: true },
      _avg: { partySize: true },
    }),
    prisma.reservation.count({
      where: { ...where, status: { in: ['COMPLETED', 'SEATED'] } },
    }),
  ]);

  const totalReservations = summaryAgg._count;
  const completionRate = totalReservations > 0 ? completedCount / totalReservations : 0;

  const bucketOrder = ['same-day', '1-2d', '3-7d', '8-14d', '15d+'];
  const leadTimeMap = new Map(leadTimeRows.map((r) => [r.bucket, Number(r.count)]));
  const leadTimeBuckets = bucketOrder.map((bucket) => ({
    bucket,
    count: leadTimeMap.get(bucket) ?? 0,
  }));

  res.json({
    success: true,
    data: {
      summary: {
        totalReservations,
        totalGuests: Number(summaryAgg._sum.partySize ?? 0),
        avgPartySize: Number((summaryAgg._avg.partySize ?? 0).toFixed(2)),
        completionRate: Number(completionRate.toFixed(4)),
        rangeStart: startDate.toISOString(),
        rangeEnd: endDate.toISOString(),
      },
      dailyBookings: dailyRows.map((d) => ({
        date: d.date,
        reservations: Number(d.reservations),
        guests: Number(d.guests),
      })),
      dayOfWeekDistribution: dowRows.map((d) => ({
        dow: d.dow,
        reservations: Number(d.reservations),
        guests: Number(d.guests),
      })),
      partySizeDistribution: partySizeRows.map((d) => ({
        partySize: d.partySize,
        count: d._count,
      })),
      statusDistribution: statusRows.map((d) => ({
        status: d.status,
        count: d._count,
      })),
      hourlyDistribution: hourlyRows.map((d) => ({
        hour: d.hour,
        reservations: Number(d.reservations),
      })),
      leadTimeBuckets,
    },
  });
}

export async function checkAvailability(req: Request, res: Response): Promise<void> {
  const { locationId, date, partySize, time: requestedTime } = req.query;

  if (!locationId || !date) {
    res.status(400).json({ success: false, error: 'locationId and date are required' });
    return;
  }

  if (typeof locationId !== 'string') {
    res.status(400).json({ success: false, error: 'Invalid locationId filter' });
    return;
  }
  if (!queryDate.safeParse(date).success) {
    res.status(400).json({ success: false, error: 'Invalid date filter' });
    return;
  }

  if (requestedTime !== undefined && !reservationTime.safeParse(requestedTime).success) {
    res.status(400).json({ success: false, error: 'Invalid time filter' });
    return;
  }

  const parsedSize = parseInt(partySize as string) || 2;

  // Get all tables at this location that can fit the party
  const tables = await prisma.table.findMany({
    where: {
      locationId: locationId as string,
      isActive: true,
      capacity: { gte: parsedSize },
    },
    orderBy: { capacity: 'asc' },
  });

  // Get existing reservations for that date at that location (non-cancelled)
  const existingReservations = await prisma.reservation.findMany({
    where: {
      locationId: locationId as string,
      date: new Date(date as string),
      status: { in: [...occupyingStatuses] },
    },
    select: { time: true, tableId: true },
  });

  // Generate time slots (e.g., 11:00 to 21:00, every 30 min)
  const slots: { time: string; available: boolean }[] = [];
  for (let h = 11; h <= 21; h++) {
    for (const m of ['00', '30']) {
      const time = `${String(h).padStart(2, '0')}:${m}`;
      // A slot is available if there are tables not reserved at that time
      const reservedTableIds = existingReservations
        .filter((r) => r.time === time && r.tableId)
        .map((r) => r.tableId);
      const availableTables = tables.filter((t) => !reservedTableIds.includes(t.id));
      slots.push({ time, available: availableTables.length > 0 });
    }
  }

  const requestedTables = requestedTime === undefined ? undefined : tables
    .filter((table) => !existingReservations.some((reservation) => reservation.time === requestedTime && reservation.tableId === table.id))
    .map(({ id, name, capacity }) => ({ id, name, capacity }));
  res.json({ success: true, data: {
    slots, totalTables: tables.length,
    ...(requestedTables === undefined ? {} : { available: requestedTables.length > 0, tables: requestedTables }),
  } });
}
