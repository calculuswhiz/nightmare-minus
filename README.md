# nightmare-minus
Nightmare<sup>-</sup> is an Electron-based rebuild of the ROM Hacking/Editing Tool for Windows. (In case you don't know your electrochemistry, e<sup>-</sup> is the general symbol for an electron.) I mostly just wanted some experience with Electron and React. (And make a ROM where all your main characters except Ninian/Nils are archers.) As a bonus, I've included that ROM here. (See notes for warnings)

## Installation
Should work with just the Make file. Haven't figured out how to do this on Windows yet. Once you run `make`, it will generate a folder called Electron Minus. This folder houses the root folder of the project, in my case, `nightmare-minus-linux-x64`. This folder contains the standalone app, with an executable is called `nightmare-minus`.

## Basic Usage (UI stuff)
- To open a ROM, hit **Open ROM...**. This opens a dialog window with which you can select your ROM file.
- The open file will then be displayed on the display line.
- To open a module file, hit **Open Module**. Both the original .NMM and its equivalent converted JSON formats are accepted.
- You can have multiple modules open. Select the one you want with the dropdown menu.
- To close a module, hit **Close Module**.
- To convert an open .NMM file to JSON, hit **Convert NMM to JSON**. (My own feature)
- To write a ROM, hit **Save ROM As...**. This is the *only* way to make changes to a ROM. Until you save, the values are only stored in memory.
- Status bar is there to tell you what went wrong. (My own feature)
