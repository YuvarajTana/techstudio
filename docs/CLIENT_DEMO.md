# Client demo: run sheet

A 10–12 minute demo of TECKSTUDIO's Design Studio. It needs **no AI keys and no internet** once the app is running; everything shown works offline.

## The day before (15 minutes)

1. Start the app: `./scripts/demo.sh`. The first build takes 5–15 minutes; see [DEPLOY](DEPLOY.md).
2. Log in with the printed demo login. It is also in `.env.docker` as `DEMO_EMAIL` / `DEMO_PASSWORD`.
3. Do a dry run of every step below **once**. This warms the fonts and caches, and leaves finished designs on the dashboard to fall back on.
4. Have one or two real photos ready, e.g. a property photo or a team photo. Upload them in the editor's **Uploads** panel.
5. Make sure `./scripts/demo.sh status` shows `ok` for every line.
6. **Showing it on the client's laptop:** use a cloud URL (DEPLOY → cloud server), or set `BIND_ADDRESS=0.0.0.0` in `.env.docker` and use your computer's IP on the same Wi-Fi.

## In the meeting

| # | Time | Show | Say |
|---|---|---|---|
| 1 | 1 min | **Dashboard → Design Studio.** The **Coming up** row shows the next festivals (Diwali, Dussehra, Bathukamma in October). | "It knows the Indian calendar, so the right templates are waiting before each festival." |
| 2 | 2 min | Open **PCS Digital · Immediate hiring**. Type a role into **Role or headline** and watch the preview update. Click two **Size** tiles (Portrait → LinkedIn) and two colour swatches. | "Type once; it lays itself out for every platform size." |
| 3 | 1 min | Click **Copy LinkedIn caption** and paste it into a notes app. | "The post text comes in your house format: facts, skills, what to send, hashtags." |
| 4 | 1 min | Click **Download PNG**. Open the file. | "That's a finished, full-resolution image, ready for LinkedIn or WhatsApp." |
| 5 | 2 min | Open **My business details** in any template, type a shop name and phone, and open **Diwali wishes**: the details are already filled in. Click **Download PNG**. | "Your details are saved, so a festival greeting takes 30 seconds." |
| 6 | 2 min | **Real estate → 3 BHK apartment → Create poster.** In the editor's **Content** tab, change the price and BHK, pick an uploaded photo, then click **Apply to page**. | "₹ prices, BHK, facing and the RERA line are built in. Everything stays editable." |
| 7 | 2 min | Back in the Studio: **Tiffin centre menu** or **Festive sale offer → Create motion video**. Press play in the video workspace. | "The same content becomes a short animated video for Reels or Status." |
| 8 | 1 min | Close: the roadmap. | "Next phase: Telugu, Hindi, Kannada, Tamil and Malayalam posters, with the same templates." |

## If something goes wrong

| Problem | Do this |
|---|---|
| A preview stays grey | Wait 2–3 seconds; the first render loads fonts. Or open one of the designs you made in the dry run. |
| The video does not render | The video preview still plays in the browser, so show that. Rendering an MP4 takes a minute; start it at the beginning of the meeting if you want to show the file. |
| The app does not load | `./scripts/demo.sh status`, then `./scripts/demo.sh` again (it is safe to re-run). Fall back to the PNGs from the dry run. |

## Avoid during the demo

- **AI generation buttons.** Without AI keys they show "unavailable". Leave them out, or add keys beforehand (DEPLOY → Security notes) and test them in the dry run.
- **Share links.** The learner view is not finished yet. Share downloaded files instead.
- **Telugu or Hindi text.** The current fonts don't include Indic scripts yet; that is the next phase.
