/* ==================================================================
   careStore — the on-device twin of CYPHIX_SERVER routes/care.ts for
   the OFFLINE build (no EXPO_PUBLIC_API_BASE_URL), behind
   `localBaseQuery`. Same semantics as the web mock (mockDatabase.ts):

     • the demo patient starts linked to the demo doctor and clinic;
     • two codes join them back after a disconnect — `CYPHDEM2` (the
       doctor) and `CYPHCNC2` (the clinic) — plus any code this store
       minted itself; any other well-formed code is "not found" (404),
       exactly as the server answers for wrong / used / expired /
       cancelled alike; a second link of the same kind is 409.

   AsyncStorage, one small JSON per key; nothing clinical lives here.
   ================================================================== */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  careLinkUrl,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_TTL_DAYS,
  normalizeInviteCode,
  type CareConnectionKind,
  type CareLinkResult,
  type CareRelationshipView,
  type InviteCreated,
  type InviteCreateInput,
  type InvitesResult,
  type InviteSummary,
} from '@cyphix/shared';
import { ENV } from '@/config/env';
import { StoreError } from './recordingStore';

const LINKS_KEY = 'cyphix:care:links';
const INVITES_KEY = 'cyphix:care:invites';

export const MOCK_INVITE_CODES = { clinician: 'CYPHDEM2', clinic: 'CYPHCNC2' } as const;

/** The same fictitious care team the demo card names (web CLAUDE.md §7.4). */
const DEMO_DOCTOR = { id: 'prac-demo-01', name: 'Dr. Demo Cardio', role: 'Cardiologist' };
const DEMO_CLINIC = { id: 'org-demo-01', name: 'CYPHIX Demo Clinic' };
const DEMO_PATIENT = 'mock-0001';
const SEED_AT = '2026-07-01T09:00:00.000Z';

const SEED_LINKS: CareRelationshipView[] = [
  {
    id: 'rel-demo-clinician',
    kind: 'clinician',
    status: 'active',
    patientId: DEMO_PATIENT,
    counterpartName: DEMO_DOCTOR.name,
    counterpartRole: DEMO_DOCTOR.role,
    consentedAt: SEED_AT,
    createdAt: SEED_AT,
    assignedClinicianId: null,
    assignedClinicianName: null,
  },
  {
    id: 'rel-demo-clinic',
    kind: 'clinic',
    status: 'active',
    patientId: DEMO_PATIENT,
    counterpartName: DEMO_CLINIC.name,
    counterpartRole: 'Clinic',
    consentedAt: SEED_AT,
    createdAt: SEED_AT,
    assignedClinicianId: DEMO_DOCTOR.id,
    assignedClinicianName: DEMO_DOCTOR.name,
  },
];

interface StoredInvite extends Omit<InviteSummary, 'state'> {
  code: string;
  cancelledAt: string | null;
}

async function read<T>(key: string, seed: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* unreadable → reseed */
  }
  return seed;
}
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

const inviteState = (i: StoredInvite): InviteSummary['state'] =>
  i.cancelledAt ? 'cancelled' : i.usedAt ? 'used' : new Date(i.expiresAt) < new Date() ? 'expired' : 'open';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

export async function listCareLinks(): Promise<CareRelationshipView[]> {
  return (await read<CareRelationshipView[]>(LINKS_KEY, SEED_LINKS)).filter(
    (r) => r.status === 'active',
  );
}

export async function linkCare(code: string): Promise<CareLinkResult> {
  const normalized = normalizeInviteCode(code);
  let kind: CareConnectionKind | null =
    normalized === MOCK_INVITE_CODES.clinician
      ? 'clinician'
      : normalized === MOCK_INVITE_CODES.clinic
        ? 'clinic'
        : null;
  const invites = await read<StoredInvite[]>(INVITES_KEY, []);
  const minted = kind
    ? undefined
    : invites.find((i) => i.code === normalized && inviteState(i) === 'open');
  if (!kind && !minted) throw new StoreError('Invite code not found', 404);
  kind = kind ?? minted!.kind;

  const all = await read<CareRelationshipView[]>(LINKS_KEY, SEED_LINKS);
  if (all.some((r) => r.status === 'active' && r.kind === kind)) {
    throw new StoreError('Already linked', 409);
  }
  const now = new Date().toISOString();
  const rel: CareRelationshipView = {
    id: `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    status: 'active',
    patientId: DEMO_PATIENT,
    counterpartName: kind === 'clinician' ? DEMO_DOCTOR.name : DEMO_CLINIC.name,
    counterpartRole: kind === 'clinician' ? DEMO_DOCTOR.role : 'Clinic',
    consentedAt: now,
    createdAt: now,
    assignedClinicianId: minted?.assignedClinicianId ?? null,
    assignedClinicianName: minted?.assignedClinicianName ?? null,
  };
  all.push(rel);
  await write(LINKS_KEY, all);
  if (minted) {
    minted.usedAt = now;
    await write(INVITES_KEY, invites);
  }
  return {
    id: rel.id,
    kind,
    status: 'active',
    counterpartName: rel.counterpartName,
    counterpartRole: rel.counterpartRole,
  };
}

export async function unlinkCare(id: string): Promise<void> {
  const all = await read<CareRelationshipView[]>(LINKS_KEY, SEED_LINKS);
  const rel = all.find((r) => r.id === id && r.status === 'active');
  if (!rel) throw new StoreError('Care relationship not found', 404);
  rel.status = 'revoked';
  await write(LINKS_KEY, all);
}

export async function listInvites(): Promise<InvitesResult> {
  const invites = await read<StoredInvite[]>(INVITES_KEY, []);
  return {
    invites: invites
      .map(({ code: _code, cancelledAt: _c, ...rest }, i) => ({ ...rest, state: inviteState(invites[i]!) }))
      .reverse(),
  };
}

export async function createInvite(input: InviteCreateInput): Promise<InviteCreated> {
  const invites = await read<StoredInvite[]>(INVITES_KEY, []);
  const now = Date.now();
  const code = randomCode();
  const invite: StoredInvite = {
    id: `inv-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    code,
    kind: input.kind,
    patientHint: input.patientHint?.trim() ? input.patientHint.trim() : null,
    assignedClinicianId: input.assignedClinicianId ?? null,
    assignedClinicianName: input.assignedClinicianId ? DEMO_DOCTOR.name : null,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + INVITE_TTL_DAYS * 86_400_000).toISOString(),
    usedAt: null,
    cancelledAt: null,
  };
  invites.push(invite);
  await write(INVITES_KEY, invites);
  return {
    id: invite.id,
    code,
    kind: invite.kind,
    expiresAt: invite.expiresAt,
    link: careLinkUrl(code, ENV.webOrigin),
  };
}

export async function cancelInvite(id: string): Promise<void> {
  const invites = await read<StoredInvite[]>(INVITES_KEY, []);
  const invite = invites.find((i) => i.id === id);
  if (!invite) throw new StoreError('Invite not found', 404);
  const state = inviteState(invite);
  if (state === 'used') throw new StoreError('This invite was already redeemed', 409);
  if (state === 'open') {
    invite.cancelledAt = new Date().toISOString();
    await write(INVITES_KEY, invites);
  }
}

// v1.0.0 — Offline care links: seeded demo links, CYPHDEM2 / CYPHCNC2, unlink, invites
//          (server v0.16.0 semantics, LAUNCH_PLAN 2.4).
