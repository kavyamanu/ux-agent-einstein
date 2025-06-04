🔧 Figma Plugin – Local Setup Guide
This guide will walk you through setting up and running the Figma plugin locally. You’ll be able to clone the repository, make edits, and test changes directly in Figma.


✅ 1. Prerequisites
Ensure you have the following tools installed:
Figma Desktop App (recommended)


Internet connection


Git – for cloning the repo


Node.js (v18 or newer recommended)


Visual Studio Code (VS Code) – recommended editor

🛠 2. Install Git (if not already installed)


MacOS:


Open Terminal and run: git --version


If Git is not installed, you will be prompted to install the Xcode Command Line Tools. Click "Install".


Or, download from https://git-scm.com/download/mac


To check if Git is installed, run:

git --version


💻 3. Install VS Code (Recommended)
VS Code is a powerful, free editor that simplifies development.
Download: https://code.visualstudio.com/


Choose your OS and follow the installer instructions.

📦 4. Clone the Plugin Repository
Open VS Code and launch a terminal (`Ctrl + ``).


Navigate to your desired folder:  cd path/to/your/folder

cd path/to/your/folder

Clone the repository:

git clone https://github.com/kavyamanu/ux-agent-einstein.git

cd ux-agent-einstein

⚙️ 5. Install Node.js (if not already installed)
Download and install from: https://nodejs.org/ (LTS version preferred).
Verify installation:

node --version

npm --version


📥 6. Install Project Dependencies
Inside the cloned folder, run:

npm install

This installs all required libraries.

🚀 7. Start the Local Development Server
[.env file has to be added at root, which will be provided in person]
In terminal, start the dev server:

npm run dev
Or, if that doesn't work:

node src/server/server.js

Leave this terminal window open while using the plugin.

🔌 8. Load the Plugin into Figma
Open Figma Desktop.


Go to the menu → Plugins → Development → Import Plugin from Manifest...


In the file dialog, navigate to your plugin folder and select the manifest.json file.


The plugin will now appear in your Plugins > Development menu.







✏️ 9. Make Code Changes & See Results
Edit files like:


src/plugin.ts


src/server/utils.js


Save your changes — the dev script watches for updates.


To reload in Figma:


Close the plugin window and reopen it from Plugins → Development.

✅ You’re all set!
Now you can test and iterate on your plugin in real time. Let me know if you'd like to add a troubleshooting section or steps for production builds.


