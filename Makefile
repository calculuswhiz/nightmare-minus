all:
	npm install
	electron-packager . --prune --out="Electron Minus"
