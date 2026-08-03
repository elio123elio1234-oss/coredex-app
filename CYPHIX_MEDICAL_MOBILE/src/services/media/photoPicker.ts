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

   The file stays where the OS put it. Nothing is uploaded: the account
   photo is a local URI until there is a server that has asked for it.
   ================================================================== */

import * as ImagePicker from 'expo-image-picker';

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

// v1.0.0 — Square camera/library picker with an explicit denied result.
