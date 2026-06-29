-- Organization member invitations (server-only access; RLS deny-all on SSOTA tables)

CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL REFERENCES profiles(id),
  invitee_email text NOT NULL,
  invitee_user_id uuid REFERENCES profiles(id),
  role text NOT NULL DEFAULT 'member' CHECK (role = 'member'),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'expired')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE UNIQUE INDEX organization_invitations_pending_email_unique
  ON organization_invitations (organization_id, lower(invitee_email))
  WHERE status = 'pending';

CREATE INDEX organization_invitations_invitee_email_status_idx
  ON organization_invitations (lower(invitee_email), status);

CREATE INDEX organization_invitations_organization_id_idx
  ON organization_invitations (organization_id);

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
