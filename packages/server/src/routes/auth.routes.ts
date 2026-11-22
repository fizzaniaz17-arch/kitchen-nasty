import { RequestHandler, Router } from 'express';
import passport from 'passport';
import {
  staffLogin,
  staffRegister,
  customerRegister,
  customerLogin,
  getMe,
} from '../controllers/auth.controller.js';
import {
  exchangeSocialLoginCode,
  handleSocialCallback,
} from '../controllers/social-auth.controller.js';
import { savePushToken } from '../controllers/push-token.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { consumeSocialAuthState, issueSocialAuthState } from '../lib/social-auth-state.js';

const router = Router();
const storefrontUrl = () => (process.env.STOREFRONT_URL || 'http://localhost:5174').replace(/\/+$/, '');

function startSocialLogin(strategy: string, scope: string[]): RequestHandler {
  return (req, res, next) => {
    const state = issueSocialAuthState(res);
    passport.authenticate(strategy, { scope, session: false, state })(req, res, next);
  };
}

const verifySocialLoginState: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (consumeSocialAuthState(req, res)) {
    next();
    return;
  }

  res.redirect(`${storefrontUrl()}/login?error=auth_failed`);
};

const handleSocialLoginFailure: RequestHandler = (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.redirect(`${storefrontUrl()}/login?error=auth_failed`);
};

// Staff auth
router.post('/staff/login', staffLogin);
router.post('/staff/register', authenticate, requireRole('SUPER_ADMIN'), staffRegister);

// Customer auth
router.post('/customer/register', customerRegister);
router.post('/customer/login', customerLogin);
router.post('/social/exchange', exchangeSocialLoginCode);
router.get('/social/failure', handleSocialLoginFailure);

// Social login — Google
if (process.env.GOOGLE_CLIENT_ID) {
  router.get('/google', startSocialLogin('google', ['profile', 'email']));
  router.get('/google/callback', verifySocialLoginState,
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/api/auth/social/failure',
    }),
    handleSocialCallback
  );
}

// Social login — Facebook
if (process.env.FACEBOOK_APP_ID) {
  router.get('/facebook', startSocialLogin('facebook', ['email']));
  router.get('/facebook/callback', verifySocialLoginState,
    passport.authenticate('facebook', {
      session: false,
      failureRedirect: '/api/auth/social/failure',
    }),
    handleSocialCallback
  );
}

// Push notifications token
router.post('/push-token', authenticate, savePushToken);

// Current user info
router.get('/me', authenticate, getMe);

export default router;
