# Onbeat

A drum practice app for electronic drum kits. A staff with a moving line shows what to play; every hit is graded for timing, the right pad, and loud or soft. Lessons go from your first quarter notes to double kick and odd time, and you can play along to songs, whole or one part at a time.

**[Open Onbeat on the web](https://eddie85u.github.io/onbeat-app/)**: works in **Google Chrome** on Mac or Windows. Nothing to install.

**[Download for Mac](https://github.com/eddie85u/onbeat-app/releases/latest)**: tap `Onbeat-mac.zip`. For Macs with Apple silicon (M1 or newer).

## Your kit
Plug the drum module into the computer with a USB cable. Onbeat finds it on its own; the top bar says **Kit:** with its name. No kit yet? The computer keyboard works as drums (the keys are shown on the kit picture).

## Installing the Mac app
1. Download `Onbeat-mac.zip` from the link above and double-click it. Drag **Onbeat** into your **Applications** folder.
2. Open it. The first time, macOS says it cannot check the app, because Onbeat is not from the App Store. Click **Done**.
3. Open **System Settings → Privacy & Security**, scroll down to the message about Onbeat and click **Open Anyway**, then confirm.
4. From then on it opens normally. Keep it in the Dock by dragging it there.

New versions install over the old one; your progress stays.

## Songs
Onbeat comes with no songs. A song is a folder with a drum chart (`notes.mid` or `notes.chart`) and its `song.ini`, plus the song's audio files if you have them; drag the folder onto the **Songs** screen. Charts made by fans for Clone Hero and YARG work.

## Your data
Your progress stays on your computer: no accounts, no ads, and nothing about your playing is sent anywhere. (The app loads its heading font from Google Fonts, and YouTube only when you pick a video for a song.) The web version keeps your progress in Chrome on that computer; **Progress → Backup** saves it to a file you can move to another computer or to the Mac app.

Built with love in Colombia, by Eddie Bello. Drum notation drawn with [VexFlow](https://github.com/vexflow/vexflow) (MIT). This repository holds the app's releases only, not its code.
