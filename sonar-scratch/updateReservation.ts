export async function updateReservation(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateReservationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Reservation not found' });
    return;
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.tableId !== undefined) data.tableId = parsed.data.tableId;
  if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
  if (parsed.data.time !== undefined) data.time = parsed.data.time;
  if (parsed.data.partySize !== undefined) data.partySize = parsed.data.partySize;
  if (parsed.data.comment !== undefined) data.comment = parsed.data.comment;

  const reservation = await prisma.reservation.update({
    where: { id },
    data,
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      table: { select: { id: true, name: true, capacity: true } },
    },
  });

  res.json({ success: true, data: reservation });
}
