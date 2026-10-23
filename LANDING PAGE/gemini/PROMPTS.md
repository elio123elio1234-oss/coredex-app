# פרומפטים ל-Gemini — תמונות לאתר CYPHIX

ארבע תמונות, אחת לכל מקום בדף שעוצב בסגנון AliveCor. עד שתביא אותן, באתר מוצגות במקומן תמונות מהמודל התלת־ממדי שלך, כך שהדף נראה שלם.

## איך עובדים (חשוב)

1. פותחים את Gemini (באפליקציה, או ב-Google AI Studio עם מודל התמונות **Gemini 2.5 Flash Image**).
2. **מצרפים את קבצי הרפרנס** מהתיקייה `gemini/refs/` שמופיעים ליד כל פרומפט. בלעדיהם Gemini ימציא רצועה אחרת בכל תמונה.
3. בוחרים את **יחס התמונה** שכתוב ליד כל פרומפט.
4. מדביקים את הפרומפט **באנגלית, כמו שהוא**; המודל מדייק יותר באנגלית.
5. מייצרים 3–4 גרסאות ובוחרים את הטובה.
   - אם הרצועה לא דומה מספיק, כותבים: `Make the strap and module match the reference image exactly.`
   - אם מופיע טקסט או לוגו, כותבים: `Remove all text and logos.`
6. שומרים בתיקייה `gemini/output/` **בשם הקובץ שמופיע** ליד כל פרומפט, ואומרים לי. אני אכניס אותן לאתר.

> הערה: התמונות של אנשים הן תמונות AI. באתר הן יסומנו "Concept imagery", ולא יוצגו כלקוחות או כמשתמשים אמיתיים.

---

## 1 · Hero — יד עם השעון והרצועה

- **מקום בדף:** החלק העליון, מימין, על הרקע הכהה.
- **שם קובץ:** `hero-wrist.jpg`
- **יחס:** 4:5 (לאורך)
- **לצרף:** `ref-1-strap-on-smartwatch.png`, `ref-2-module-electrodes-back.png`

```
Photorealistic studio product photograph for a medical-technology website hero. A person's left wrist wearing a modern rectangular smartwatch fitted with the Cyphix ECG strap shown in the attached reference images: a slate-blue silicone band carrying a slim brushed-titanium module with polished stainless-steel electrode plates on the outer side of the band, and small finished aluminium lug adapters where the band meets the watch. Reproduce the strap and module exactly as in the references — same shape, colours, proportions and electrode layout; do not add buttons, lights or logos. The index finger of the person's right hand rests lightly on the module's electrode plate, as if taking a reading. The watch display glows with six thin horizontal ECG waveforms in soft coral, peach, yellow, mint, sky-blue and lavender on a black screen. Framing: three-quarter view from slightly above, the wrist and hands entering from the lower right, the watch slightly right of centre, generous empty space on the left and at the top. Background: seamless dark charcoal-slate studio backdrop, exactly hex #363A43, evenly lit, no gradient, no texture. Lighting: soft key light from the upper left, a cool rim light behind the wrist separating it from the background, gentle highlights on the metal. Natural, realistic skin with fine texture, neutral nails, no jewellery other than the watch. Full-frame camera, 100 mm macro lens, f/5.6, crisp focus on the module and the watch face. No text, no logos, no watermark, no UI labels, no captions.
```

---

## 2 · רגע בבית — "1 in 3 deaths…"

- **מקום בדף:** החלק החצוי (תמונה משמאל, טקסט מימין), מיד אחרי פס המספרים.
- **שם קובץ:** `home-moment.jpg`
- **יחס:** 1:1 (ריבוע)
- **לצרף:** `ref-1-strap-on-smartwatch.png`

```
Photorealistic lifestyle photograph for a medical-technology website. A woman in her early sixties sits on a light linen sofa in a calm, modern living room in the late afternoon. She pauses and rests her right index finger on the module of the Cyphix ECG strap on her left wrist — the strap in the attached reference: a slate-blue silicone band with a slim brushed-titanium module and polished electrode plates, on a rectangular smartwatch. Reproduce the strap exactly. Her expression is calm and focused, not worried. On the low oak coffee table in front of her a smartphone lies face up, showing six thin ECG waveforms on a white screen, with no readable text. Warm natural window light from the left, soft shadows, shallow depth of field (85 mm, f/2), focus on her hands and the strap, her face slightly softer. Palette: warm neutrals, linen and oak, with the slate-blue strap as the strongest colour. Documentary, unposed, editorial quality. No text, no logos, no watermark.
```

---

## 3 · שלושה אנשים, שלושה שעונים, אותה רצועה — "One strap. Any watch."

- **מקום בדף:** הפס הרחב לכל רוחב המסך, עם הכרטיס הכחול שעולה עליו.
- **שם קובץ:** `any-watch-group.jpg`
- **יחס:** 21:9 (רחב מאוד). אם אין 21:9, אפשר 16:9.
- **לצרף:** `ref-1-strap-on-smartwatch.png`, `ref-3-strap-alone.png`, `ref-4-strap-on-analog-watch.png`

```
Photorealistic wide lifestyle photograph for a medical-technology website, 21:9. Three adults sit side by side on a sofa in a bright, modern home with plants and white walls, smiling naturally at the camera, each raising one forearm to show their watch: on the left a woman in her forties with a rectangular smartwatch; in the middle a man in his late sixties with a classic analog watch with a white dial and a silver case; on the right a woman in her thirties with a round sports watch. All three wear the identical Cyphix ECG strap from the attached references — a slate-blue silicone band with a slim brushed-titanium module carrying polished electrode plates — clearly the same strap on three different watches. Reproduce the strap exactly; the watches differ, the strap does not. Diverse ethnicities, natural clothing in soft neutral tones (denim, cream knitwear, grey). Soft daylight, warm and optimistic, shallow depth of field with the wrists and faces in focus. Keep the lower 40% of the frame visually calm (laps and sofa), because text will be overlaid there. No text, no logos, no watermark.
```

---

## 4 · במרפאה — "Who it's for"

- **מקום בדף:** ליד הרשימה "For patients / For clinicians / For clinics", מימין.
- **שם קובץ:** `clinic-review.jpg`
- **יחס:** 16:10 (או 16:9)
- **לצרף:** `ref-1-strap-on-smartwatch.png`

```
Photorealistic documentary photograph for a medical-technology website, 16:10. In a bright, modern cardiology clinic with blue-grey walls, a female cardiologist in her forties in a white coat holds a tablet and goes over a 6-lead ECG recording with a male patient in his sixties standing beside her. The tablet screen shows six thin black ECG waveforms on a light pink grid in a 2×3 layout, with no readable text. The patient wears a rectangular smartwatch with the Cyphix ECG strap from the attached reference (a slate-blue silicone band with a slim brushed-titanium module and polished electrode plates) — reproduce the strap exactly. Both look engaged and at ease. Soft overhead and window light, natural skin tones, 50 mm, f/2.8, focus on the tablet and their faces. Calm, trustworthy, professional. No text, no logos, no watermark, no brand names on clothing.
```

---

<!-- v0.9.0 — four Gemini image prompts for the AliveCor-style page, with product references from the 3D model -->
