/* ==================================================================
   Photo picker — camera and library, behind one small surface so no
   component ever touches a permission API.

   Two things it guarantees to callers:
     • a SQUARE image. The avatar is a circle everywhere it appears, so
       cropping is done once, here, rather than by five different
       `resizeMode`s later.
     • a three-way answer: a URI, `null` (the patient backed out), or
       `'denied'` (the OS said no, and the UI must explain rather than
       appear broken).

   The picker returns a local URI. `toPortraitDataUrl` is what turns that
   into something the SERVER can hold — see the note on it below; the two
   are separate because the onboarding wizard shows the picture long
   before there is an account to attach it to.
   ================================================================== */

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type PhotoResult = { uri: string } | null | 'denied';

/** Square, and small enough that a 12 MP camera does not put a 4 MB
    string through the bridge for a 132 pt circle. */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

function toResult(result: ImagePicker.ImagePickerResult): PhotoResult {
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  return asset ? { uri: asset.uri } : null;
}

export async function takePhoto(): Promise<PhotoResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return 'denied';
  return toResult(await ImagePicker.launchCameraAsync(OPTIONS));
}

export async function pickPhoto(): Promise<PhotoResult> {
  /* On both platforms the modern library picker runs out of process and
     needs no permission for a single user-chosen image — but ask anyway
     where the OS still wants it, and treat a refusal as a refusal. */
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  return toResult(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}

/* ── Portrait, sized for the wire ────────────────────────────────────
   The server stores the portrait as a data-URL inside the patient's
   encrypted health profile and caps it at 1 500 000 characters. A phone
   camera does not respect that: a square crop off a 12 MP sensor is
   several megabytes, and base64 adds a third on top — so uploading what
   the picker returns would fail on exactly the good cameras.

   So it is resized here, on the device, before it ever becomes a string.
   512 px is the honest number: the avatar is 68 pt and the web's own
   cropper saves about the same, so this is already generous for a 3×
   screen, and anything larger is bytes nobody will ever see. That takes a
   typical portrait to ~40 KB — roughly 3 % of the cap, which means the
   limit stops being something a patient can hit.

   This is what `expo-image-manipulator` was added for: the web does the
   equivalent on a canvas, and React Native has no canvas. Doing it with
   the picker's `quality` alone would only lower JPEG quality, never the
   pixel count — the expensive part. */

/** Longest edge of a stored portrait, in pixels. */
const PORTRAIT_PX = 512;
/** JPEG quality. 0.8 is where the artefacts stop being visible at 68 pt. */
const PORTRAIT_QUALITY = 0.8;

/**
 * Local image URI → a `data:image/jpeg;base64,…` URL small enough to store.
 * Returns null if the image cannot be read or encoded, so a caller can say
 * "that photo could not be used" instead of uploading nothing silently.
 */
export async function toPortraitDataUrl(uri: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(uri);
    /* Width only: the picker already cropped to 1:1, and passing both
       would re-stretch anything that is not exactly square. */
    context.resize({ width: PORTRAIT_PX });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      base64: true,
      compress: PORTRAIT_QUALITY,
      format: SaveFormat.JPEG,
    });
    return result.base64 ? `data:image/jpeg;base64,${result.base64}` : null;
  } catch {
    return null;
  }
}

// v1.1.0 — Adds toPortraitDataUrl: resizes to 512 px and encodes, so a phone
//          camera cannot produce a portrait the server has to refuse.
// v1.0.0 — Square camera/library picker with an explicit denied result.
