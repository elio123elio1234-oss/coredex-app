/* ==================================================================
   storedLimbLeads — a STORED recording in, the six raw-domain leads out.

   `limbLeadsFromRaw` (@cyphix/shared) is the one place that decides
   fuse-or-not for a set of raw channels. What it cannot know is whether
   the channels it is handed MAY be fused at all, and that depends on the
   recording, not on the samples:

     ⚠️ NEVER a chest capture. In the chest protocol the probe electrode moves
     from V1 to V6 while the second left-leg electrode stays on the leg, so
     `leadIIb` there is a different lead, not a second copy of this one.
     'limb' AND '12lead' both qualify — the 12-lead flow files its LIMB capture
     under '12lead' — which is why the rule is `recordingAllowsFusion` from
     @cyphix/shared and not a comparison with 'limb' written here.

   The viewer, the PDF and the History digest all open stored recordings,
   and that gate written three times is three chances for the list, the
   screen and the paper to describe one recording differently — the exact
   failure `limbLeadsFromRaw` was written to prevent, one level up. So the
   decode and the gate live here, once.

   A recording with no second copy goes straight through, bit for bit:
   same decode, same clamp to the shorter channel, same `deriveLeads` loop.

   (Pure, and only waiting for a home: it belongs next to `limbLeadsFromRaw`
   in @cyphix/shared the next time that package is opened.)
   ================================================================== */

import {
  decodeChannel,
  limbLeadsFromRaw,
  recordingAllowsFusion,
  type LimbLeadsFromRaw,
  type LimbLeadsOptions,
  type StoredRecording,
} from '@cyphix/shared';

export function limbLeadsFromRecording(
  recording: StoredRecording,
  options: LimbLeadsOptions = {},
): LimbLeadsFromRaw {
  const rawI = decodeChannel(recording.channels.leadI);
  const rawII = decodeChannel(recording.channels.leadII);
  const rawIIb =
    recordingAllowsFusion(recording.type) && recording.channels.leadIIb
      ? decodeChannel(recording.channels.leadIIb)
      : null;
  return limbLeadsFromRaw(rawI, rawII, rawIIb, recording.sampleRate, options);
}

// v1.0.1 — The gate is the shared `recordingAllowsFusion` ('chest' is the only no): a
//          '12lead' recording stores the limb capture too, and was being left unfused.
// v1.0.0 — One decode + one "limb only" gate in front of the shared
//          `limbLeadsFromRaw`, shared by the viewer, the PDF and the digest.
