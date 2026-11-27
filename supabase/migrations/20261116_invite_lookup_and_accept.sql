alter table public.qr_sessions
  alter column expires_at set default (now() + interval '20 minutes');
