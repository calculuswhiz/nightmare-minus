/*
To compile (from parent directory):
npx babel jsx/InputComponent.jsx --out-file scripts/InputComponent.js
*/
const {app, dialog} = require('electron').remote;
const fs = require('fs');
const React = require('react');
const ReactDOM = require('react-dom');
const prompt = require('electron-prompt');
// We'll add this in eventually.
const bigInt = require('big-integer');

/**
Displays the currently loaded ROM in a little text box.
Props:
	- id: id of the div element
	- path: the path of the ROM File to be displayed
*/
class DisplayFilePath extends React.Component 
{
	render()
	{
		return <div className="DisplayFilePath" id={this.props.id}>
			Current ROM: {this.props.path}
		</div>;
	}
}

/**
If a module is available to select, display a dropdown menu
Props:
	- id: id of the div element
	- moduleData: the module object to pull data from
	- curModIndex: the selection index for the menu
	- changeModuleIndex(i): the callback when a selection is made. Passes the selected module index back to parent.
*/
class ModuleSelector extends React.Component 
{
	constructor(props)
	{
		super(props);
		
		this.selectModule = this.selectModule.bind(this);
	}
	
	selectModule(event)
	{
		this.props.changeModuleIndex(event.target.value);
	}
	
	render()
	{
		let optionArray = this.props.moduleData;
		return <div className="ModuleSelector" id={this.props.id}>
			{"Current Module: "}
			{
				(this.props.curModIndex == -1)?
				(
					"No modules loaded"
				)
				: 
				(
					<select id="selComponent" value={this.props.curModIndex} onChange={this.selectModule}>
						{optionArray.map((mod, idx)=>
						{
							return <option key={idx} value={idx}>
								{mod.Header.NMMDescription}
							</option>;
						})}
					</select>
				)
			}
		</div>;
	}
}

/**
All numeric editboxes.
Shows a representation of the number that reflects the input box next to it.
The input box is validated on input.
Props:
	- type: number representation
		- HS
		- HU
		- DS
		- DU
	- index: index of entryComponent
	- EntrySize: number of represented
	- changeHandler(bytes): callback when value has changed
*/
class NEDLink extends React.Component
{
	constructor(props)
	{
		super(props);
		
		let fieldVal = new bigInt(this.props.value);
		
		let maxUInt = new bigInt(2).pow(8 * this.props.EntrySize);
		
		switch(this.props.type)
		{
			case "HS":
				// Check sign bit:
				if(fieldVal.and((this.props.EntrySize * 8 - 1)).neq(0))
				{
					// 2s complement
					fieldVal = fieldVal.subtract(maxUInt);
				}
				var representation = fieldVal.toString(16);
				// Pad:
				if(representation.length % 2 == 1)
				{
					representation = `0${representation}`;
				}
				while(representation.length / 2 < this.props.entrySize)
				{
					representation = `00${representation}`;
				}
				representation = `0x${representation}`;
				break;
			case "HU":
				var representation = fieldVal.toString(16);
				// Pad:
				if(representation.length % 2 == 1)
				{
					representation = `0${representation}`;
				}
				while(representation.length / 2 < this.props.entrySize)
				{
					representation = `00${representation}`;
				}
				representation = `0x${representation}`;
				break;
			case "DS":
				// Check sign bit:
				if(fieldVal.and((this.props.EntrySize * 8 - 1)).neq(0))
				{
					// 2s complement
					fieldVal = fieldVal.subtract(maxUInt);
				}
				var representation = fieldVal.toString(10);
				
			break;
			case "DU":
				var representation = fieldVal.toString(10);
				break;
		}
		
		this.state = {
			value: representation
		};
		
		this.clickHandler = this.clickHandler.bind(this);
	}
	
	static getDerivedStateFromProps(nextProps, prevState)
	{
		let fieldVal = new bigInt(nextProps.value);
		
		if(fieldVal != prevState.value)
		{
			// 2 ** (8 * nextProps.EntrySize)
			let maxUInt = new bigInt(2).pow(8 * nextProps.EntrySize);
			
			switch(nextProps.type)
			{
				case "HS":
					// Check sign bit:
					// fieldVal & (nextProps.EntrySize * 8 - 1) != 0
					if(fieldVal.and((nextProps.EntrySize * 8 - 1)).neq(0))
					{
						// 2s complement
						// fieldVal -= maxUInt
						fieldVal = fieldVal.subtract(maxUInt);
					}
					var representation = fieldVal.toString(16);
					// Pad:
					if(representation.length % 2 == 1)
					{
						representation = `0${representation}`;
					}
					while(representation.length / 2 < nextProps.entrySize)
					{
						representation = `00${representation}`;
					}
					representation = `0x${representation}`;
					break;
				case "HU":
					var representation = fieldVal.toString(16);
					// Pad:
					if(representation.length % 2 == 1)
					{
						representation = `0${representation}`;
					}
					while(representation.length / 2 < nextProps.entrySize)
					{
						representation = `00${representation}`;
					}
					representation = `0x${representation}`;
					break;
				case "DS":
					// Check sign bit:
					// fieldVal & (nextProps.EntrySize * 8 - 1) != 0
					if(fieldVal.and((nextProps.EntrySize * 8 - 1)).neq(0))
					{
						// 2s complement
						fieldVal = fieldVal.subtract(maxUInt);
					}
					var representation = fieldVal.toString(10);
					break;
				case "DU":
					var representation = fieldVal.toString(10);
					break;
			}
			
			return {
				value: representation
			};
		}
		
		return null; 
	}
	
	clickHandler(event)
	{	
		if(window.isPromptOpen)
		{
			window.setStatusMessage("Prompt window is already open. Please close that one first.");
			return;
		}
			
		function fulfill(validateMe)
		{
			window.isPromptOpen = false;
			
			if(validateMe === null)
			{
				window.setStatusMessage("Prompt cancelled.");
				return;
			}
			
			let fieldVal;
			
			switch(this.props.type)
			{
				case "HS":
					try
					{
						fieldVal = new bigInt(validateMe);
					}
					catch(exception)
					{
						window.setStatusMessage("Hex (signed) value is invalid.");
						return;
					}
					break;
				case "HU":
					try
					{
						fieldVal = new bigInt(validateMe);
					}
					catch(exception)
					{
						window.setStatusMessage("Hex (unsigned) is invalid.");
						return;
					}
					break;
				case "DS":
					try
					{
						fieldVal = new bigInt(validateMe);
					}
					catch(exception)
					{
						window.setStatusMessage("Dec (signed) is invalid.");
						return;
					}
					break;
				case "DU":
					try
					{
						fieldVal = new bigInt(validateMe);
					}
					catch(exception)
					{
						window.setStatusMessage("Dec (unsigned) is invalid.");
						return;
					}
					break;
			}
			
			this.setState({
				value: validateMe
			});
			
			// Convert to bytes:
			let bytes = [];
			for(let i=0; i<this.props.EntrySize; i++)
			{
				// bytes[i] = fieldVal & 0xff;
				bytes[i] = fieldVal.and(0xff);
				// fieldVal >>= 8;
				fieldVal = fieldVal.divide(256);
			}
			
			// Write bytes:
			this.props.changeHandler(bytes);
		}
		
		window.isPromptOpen = true;
		
		prompt({
			title: 'Input a new value',
			label: 'New value:',
			value: this.state.value.toString(),
			inputAttrs: {
				type: "text"
			}
		})
		.then(fulfill.bind(this));
	}
	
	render()
	{
		return <div className="NEDLink">
			<a id={`converted${this.props.index}`} onClick={this.clickHandler} href="#">
				{`${this.state.value}`}
			</a>
		</div>;
	}
}

/**
Field inputs for the Table Editor
Props:
	- type: the type of input. Acceptable types are:
		TEXT - Text editbox
		HEXA - Hex array (useful for indicating and changing unknowns)
		NEHU - Numeric editbox, hex unsigned
		NEDS - Numeric editbox, decimal signed
		NEDU - Numeric editbox, decimal unsigned
		NDHU - Numeric dropbox, hex unsigned
		NDDU - Numeric dropbox, decimal unsigned
	- location: ROM edit address
	- EntrySize: number of bytes that this field writes.
	- DropdownParams: parameters for a dropdown list
	- index: index of entryComponent
	- writeROMBufferHandler: callback to write to ROM buffer, give addr, array of bytes.
	- readROMBufferHandler: callback to read from ROM buffer, give addr, num bytes.
State: 
	- fieldVal: the current value at the ROM location pointed to by the field
*/
class FieldInput extends React.Component
{
	constructor(props)
	{
		super(props);
		
		this.changeValue = this.changeValue.bind(this);
		this.changeDrop = this.changeDrop.bind(this);
		
		// Read a value:
		let ROMdata = this.props.readROMBufferHandler(this.props.location, this.props.EntrySize);
		if(ROMdata === undefined)
		{
			ROMdata = [];
		}
		
		this.state = {
			fieldVal: ROMdata
		};
	}
	
	changeValue(bytes)
	{
		// Write:
		this.props.writeROMBufferHandler(this.props.location, bytes);
		let data = this.props.readROMBufferHandler(this.props.location, this.props.EntrySize);
		// Get new state.
		this.setState({
			fieldVal: data
		});
	}
	
	changeDrop(event)
	{
		// Obtain array of bytes (little endian);
		let processMe = new bigInt(event.target.value);
		let bytes = [];
		
		for(let i=0, len=this.props.EntrySize; i<len; i++)
		{
			// bytes[i] = processMe & 0xff;
			bytes[i] = processMe.and(0xff);
			// processMe >>= 8;
			processMe = processMe.divide(256);
		}
		
		this.changeValue(bytes);
	}
	
	static getDerivedStateFromProps(nextProps, prevState)
	{
		return {
			fieldVal: nextProps.readROMBufferHandler(nextProps.location, nextProps.EntrySize)
		};
	}
	
	render()
	{
		if(this.props.type.search(/\b(TEXT|HEXA|N(EHU|EDS|EDU|DHU|DDU))\b/) != 0)
		{
			throw `${this.props.type} not recognized as an input type.`;
		}
		
		// Little Endian: (low significance = low address)
		let valueString = (this.state.fieldVal === undefined)?
				""
			:
				// Take an array of bytes, change it into a hexadecimal string.
				this.state.fieldVal.reduce((acc, curVal, idx)=>
				{
					let hexed = curVal.toString(16);
					if(hexed.length == 1)
						hexed = "0" + hexed;
					return hexed + acc;
				}, "");
		
		
		switch(this.props.type)
		{
			case "TEXT":
				// @todo: ASCII-ify. implement onchange action
				var inputElements = <input type="text" maxLength={this.props.EntrySize} 
				className="TEXT" value={valueString} />;
				break;
			case "HEXA":
				// @todo:implement onchange action
				// 2 characters per byte:
				var inputElements = <input type="text" maxLength={2 * this.props.EntrySize} 
				className="HEXA" value={valueString} />;
				break;
			// Numeric editboxes.
			case "NEHU":
			case "NEDS":
			case "NEDU":
			// Precede with 0x 
				var inputElements = <NEDLink type={this.props.type.slice(2)} index={this.props.index} value={`0x${valueString}`} EntrySize={this.props.EntrySize} 
				changeHandler={this.changeValue}/>;
				break;
			// Dropdown menus:
			case "NDHU":
				var inputElements = <select id={`DH${this.props.index}`} value={parseInt(`0x${valueString}`)} onChange={this.changeDrop} > 
					{
						this.props.DropdownParams.map((param, idx)=>
						{
							return <option key={idx} value={parseInt(param.value)}>
								{`${param.description} (0x${param.value.toString(16)})`}
							</option>;
						})
					}
				</select>;
				break;
			case "NDDU":
				var inputElements = <select id={`DD${this.props.index}`} value={parseInt(`0x${valueString}`)} onChange={this.changeDrop} > 
					{
						this.props.DropdownParams.map((param, idx)=>
						{
							return <option key={idx} value={parseInt(param.value)}>
								{`${param.description} (${param.value})`}
							</option>;
						})
					}
				</select>;
				break;
		}
		
		return <div className="FieldInput">
			{inputElements}
		</div>;
	}
}

/**
The Table Entry Editor:
Props:
	- curModule: currently selected Module
	- index: current selected entry in table
	- writeROMBufferHandler: callback to write to ROM buffer, give addr, array of bytes. (passed down)
	- readROMBufferHandler: callback to read from ROM buffer, give addr, num bytes. (passed down)
*/
class TableEntryEditor extends React.Component
{
	constructor(props)
	{
		super(props);
	}
	
	render()
	{
		let EntryComponents = this.props.curModule.EntryComponents;
		
		// construct the entry components here:
		return <div id="TableEntryEditor">
			{
				EntryComponents.map((entry, idx)=>
				{
					// Get Base address, use length to determine where to go:
					let address = this.props.curModule.Header.BaseAddress + this.props.curModule.Header.EntryLength	* this.props.index + entry.AddressOffset;
					
					return <div className="entryField"
								key={idx}>
						<div className="entryLabel"title={`0x${address.toString(16)}`}>
							{entry.EntryInfo}
						</div>
						<FieldInput type={entry.EditElement} location={address} DropdownParams={entry.DropdownParams} EntrySize={entry.EntrySize} index={idx} writeROMBufferHandler={this.props.writeROMBufferHandler} readROMBufferHandler={this.props.readROMBufferHandler} />
					</div>;
				})
			}
		</div>;
	}
}

/**
The main body of the Table Entry Editor
Props:
	- id: id of div
	- curModule: currently selected module object
	- modIndex: index of the module object
	- writeROMBufferHandler: callback to write to ROM buffer, give addr, array of bytes. (passed down)
	- readROMBufferHandler: callback to read from ROM buffer, give addr, num bytes. (passed down)
State:
	- entryIndex: Currently selected table entry
*/
class EditorMain extends React.Component
{
	constructor(props)
	{
		super(props);
		
		// this.changeModuleIndex = this.changeModuleIndex.bind(this);
		
		this.state = {
			entryIndex: 0,
			modIndex: this.props.modIndex
		};
		
		this.selectEntry = this.selectEntry.bind(this);
	}
	
	static getDerivedStateFromProps(nextProps, prevState)
	{
		if(nextProps.modIndex != prevState.modIndex)
		{
			return {
				entryIndex: 0,
				modIndex: nextProps.modIndex
			};
		}
		
		return null;	
	}
	
	selectEntry(event)
	{
		this.setState({
			entryIndex: event.target.value
		});
	}
	
	render()
	{
		let curModule = this.props.curModule;
		
		if(this.props.curModule === undefined)
		{
			return <div id={this.props.id}>
				Awaiting Files
			</div>
		}
		
		let entries = curModule.Header.EntryNameList;
		
		return <div id={this.props.id}>
			<h3 id="ModuleDescription">
				{curModule.Header.NMMDescription}
			</h3>
			<div id="TableInterface">
				{"Table Entry: "}
				<select id="selEntry" value={this.state.entryIndex} onChange={this.selectEntry}>
					{
						entries.map((entry, idx)=>
						{
							return <option key={idx} value={idx}>
										{`${entry} (${idx})`}
									</option>;
						})
					}
				</select>
				<TableEntryEditor curModule={curModule} index={this.state.entryIndex} writeROMBufferHandler={this.props.writeROMBufferHandler} readROMBufferHandler={this.props.readROMBufferHandler} />
			</div>
		</div>;
	}
}

/**
Main GUI Component for the editor.
State:
	- Config: Data to be written to the config file.
	- ROMFilePath: Holds the filepath for loaded ROM.
	- ROMDataBuffer: Holds the data buffer for the ROM.
	- ModFiles: Array of paths for loaded mod files.
	- ModData: Array of module objects
	- curModIndex: Which module is selected
Module objects:
	- Format: Expects the string "nmm/json".
	- Header:
		- NMMVersion: Version string
		- NMMdescription: description string
		- BaseAddress: table's base address
		- EntryCount: number of entries in table (Probably can skip because of JS)
		- EntryLength		number of items per table (Probably can skip because of JS)
		- EntryNameList: The names of each of the Entries. empty - numbers only. run out of names - start numbering
		- EntryNameFile: Name each of the table entries.
		- TextEntryList: The table file list for TEXT entries. empty - ASCII, otherwise translate to number indicated by list
		- TextEntryFile: File used for TEXT entries.
	- EntryComponents: array of entrycomponent objects.
EntryComponent objects:
	- EntryInfo: Text description of EntryComponent
	- AddressOffset: Bytes offset from base address of table
	- EntrySize: Number of bytes to write to the buffer
	- EditElement: Specify one of the following types:
		TEXT
		HEXA
		NEHU
		NEDS
		NEDU
		NDHU
		NDDU
	- DropdownFile: Name of the file used to name the Dropdown items.
	- DropdownParams: Name list for dropboxes. Ignored in non-dropbox items.
*/
class RootComponent extends React.Component 
{
	constructor(props)
	{
		super(props);

		// This binding is necessary to make `this` work in the callback
		this.selectROM				= this.selectROM.bind(this);
		this.openModule				= this.openModule.bind(this);
		this.closeModule			= this.closeModule.bind(this);
		this.convertModuleToJSON	= this.convertModuleToJSON.bind(this);
		
		this.changeModuleIndex	= this.changeModuleIndex.bind(this);
		
		this.writeROMBuffer 	= this.writeROMBuffer.bind(this);
		this.readROMBuffer 		= this.readROMBuffer.bind(this);
		
		this.saveROMAs 			= this.saveROMAs.bind(this);
		
		let configDir = app.getPath("appData");
		let homeDir = app.getPath("home");
		let fileBuffer;
		let jsondata;
		try
		{
			fileBuffer = fs.readFileSync(`${configDir}/NightmareMinus.json`, 'utf8');
			jsondata = JSON.parse(fileBuffer);
		}
		catch(exception)
		{
			console.log(exception);
			console.error("Config file not found or error occurred in reading it. Creating a new one.");
			fs.writeFileSync(`${configDir}/NightmareMinus.json`, `{"lastROMDirectory" : "${homeDir}", "lastModuleDirectory" : "${homeDir}"}`);
			fileBuffer = fs.readFileSync(`${configDir}/NightmareMinus.json`, 'utf8');
			jsondata = JSON.parse(fileBuffer);
		}
		
		
		this.state = {
			Config 			: jsondata,
			ROMFilePath     : "",
			// Data:
			ROMDataBuffer   : null,
			ModFiles        : [],
			ModData         : [],
			curModIndex     : -1
		};
	}
	
	selectROM()
	{
		function loadBinaryFile(paths)
		{
			if(paths === undefined)
			{
				return;
			}
			
			let path = paths[0]; // Return only one path
			this.setState({
				ROMFilePath: path
			});
			
			// Read all bytes into buffer:
			let data = fs.readFileSync(path);
			
			window.setStatusMessage(`ROM loaded from ${path}`);
			
			// Read ok. Write config file.
			let tempdata = this.state.Config;
			tempdata["lastROMDirectory"] = path.match(/.*[/\\]/)[0];
			
			this.setState({
				jsondata: tempdata,
				ROMDataBuffer: data
			}, ()=>
			{
				fs.writeFileSync(app.getPath('appData')+"/NightmareMinus.json", JSON.stringify(this.state.jsondata));
			});
		}
		
		dialog.showOpenDialog(
		{
			title       : "Please Select a ROM",
			buttonLabel : "Select",
			defaultPath : this.state.Config.lastROMDirectory,
			properties  : ["openFile"]
		}, loadBinaryFile.bind(this));
	}
	
	openModule()
	{
		function parseNMM(data)
		{
			// Original Nightmare Module file
			const modFileDir = this.state.ModFiles[this.state.curModIndex].match(/.*[/\\]/)[0];
			
			// Check if it's a JSON
			try
			{
				let jsonModule = JSON.parse(data);
				
				// Validate nmm/json Format
				if(jsonModule.Format != "nmm/json")
				{
					throw {
						message: setStatusMessage("Unable to load JSON file. Could not find key {\"Format\": \"nmm/json\""),
						BADJSON: true
					};
				}
				
				// Easy load process.
				let parsed = {
					Format 			: "nmm/json",
					Header 			: jsonModule.Header,
					EntryComponents	: jsonModule.EntryComponents
				};
				
				// Now just read the list files just like for an old module.
				
				//First, the Name list.
				parsed.Header.EntryNameList = [];
				if(parsed.Header.EntryNameFile != "")
				{
					console.log("Loading Namefile");
					let filePath = modFileDir + parsed.Header.EntryNameFile;
					
					try {
						let data = fs.readFileSync(filePath, 'utf8');
						
						let lines = data.split('\n');
						for(let line of lines)
						{
							line = line.replace(/\r/, "");   // In case of Windoze.
							parsed.Header.EntryNameList.push(line);
						}
						while(parsed.Header.EntryNameList.length < parsed.Header.EntryCount)
						{
							let entryCtr = parsed.Header.EntryNameList.length;
							parsed.Header.EntryNameList.push(`ENTRY${entryCtr}`);
						}
					} 
					catch(e) 
					{
						window.setStatusMessage(e);
					}
				} 
				else 
				{
					while(parsed.Header.EntryNameList.length < parsed.Header.EntryCount)
					{
						let entryCtr = parsed.Header.EntryNameList.length;
						parsed.Header.EntryNameList.push(`ENTRY${entryCtr}`);
					}
				}
				
				// TEXT Entry List:
				parsed.Header.TextEntryList = [];
				if(parsed.Header.TextEntryFile != "")
				{
					console.log("Loading Text Entry file");
					let entry = modFileDir + parsed.Header.TextEntryFile;
					
					try 
					{
						let data = fs.readFileSync(entry, 'utf8');
						
						let lines = data.split('\n');
						for(let line of lines)
						{
							line = line.replace(/\r/, "");   // In case of Window$.
							parsed.Header.TextEntryList.push(line);
						}
					} 
					catch(e) 
					{
						window.setStatusMessage(e);
					}
				}
				
				// Every dropdown file:
				parsed.EntryComponents.forEach((curEntryComponent, idx)=>
				{
					curEntryComponent.DropdownParams = [];
					
					// Only care if it's a dropdown:
					if(curEntryComponent.EditElement == "NDDU" || curEntryComponent.EditElement == "NDHU")
					{
						if(curEntryComponent.DropdownFile != "")
						{
							console.log("Loading Parameter file");
							
							let filePath = modFileDir + curEntryComponent.DropdownFile;
							
							try 
							{
								let data = fs.readFileSync(filePath, 'utf8');
								
								let lines = data.split('\n').slice(1);  // Thanks to JS, we can skip line 1.
								for(let line of lines)
								{
									line = line.replace(/\r/, "");   // In case of Bill Gates.
									let paramLine = line.match(/^(.+?) (.*)$/m);
									if(paramLine == null)
									{
										continue;
									}
									
									curEntryComponent.DropdownParams.push({
										"value" : parseInt(paramLine[1]),
										"description" : paramLine[2]
									});
								}
							} 
							catch(e) 
							{
								// statements
								window.setStatusMessage(e);
							}
						}
					}
				});
				
				window.setStatusMessage("Module file successfully parsed (JSON)");
				
				return parsed;
			}
			catch(exception)
			{
				if(exception.BADJSON)
				{
					console.error(exception);
					return;
				}
				
				// Read ok. Write config file.
				let tempdata = this.state.Config;
				tempdata["lastModuleDirectory"] = modFileDir;
				this.setState({
					jsondata: tempdata
				}, ()=>
				{
					fs.writeFileSync(app.getPath('appData')+"/NightmareMinus.json", JSON.stringify(this.state.jsondata));
				});
				
				const dataLines = data.split('\n');
				
				let parsed = {
					Format		: "nmm/json",	
					Header 		: {
						NMMVersion			: "",
						NMMdescription		: "",
						BaseAddress			: 0,
						EntryCount			: 0,
						EntryLength			: 0,
						EntryNameList		: [],
						EntryNameFile		: "",		// Metadata for JSON conversion
						TextEntryList		: [],
						TextEntryFile 		: ""		// Metadata for JSON conversion
					},
					EntryComponents : []
				};
				
				let EntryComponent = function() 
				{
					this.EntryInfo		= "";
					this.AddressOffset	= 0;
					this.EntrySize		= 0;
					this.EditElement	= "";
					this.DropdownFile 	= "";		// Metadata for JSON conversion
					this.DropdownParams = [];
				};
				
				let mode = "VERSION";
				let curEntryComponent;
				for(let curLine of dataLines)
				{
					curLine = curLine.replace(/\r/, "");   // In case of Windows.
					if(curLine[0] == "#" || curLine.replace(/\s+/, '').length==0)
					{
						continue;
					}
					
					// State machine for parsing module files:
					if(mode == "VERSION")
					{
						parsed.Header.NMMVersion = curLine;
						mode = "DESCRIPTION";
					} 
					else if(mode == "DESCRIPTION")
					{
						parsed.Header.NMMDescription = curLine;
						mode = "BASE";
					} 
					else if(mode == "BASE")
					{
						parsed.Header.BaseAddress = parseInt(curLine);
						mode = "NUMENTRIES";
					} 
					else if(mode == "NUMENTRIES")
					{
						parsed.Header.EntryCount = parseInt(curLine);
						mode = "ELENGTH";
					} 
					else if(mode == "ELENGTH")
					{
						parsed.Header.EntryLength = parseInt(curLine);
						mode = "NAMEFILE";
					} 
					else if(mode == "NAMEFILE")
					{
						// Read Namefile.
						if(curLine != "NULL")
						{
							console.log("Loading Namefile");
							let filePath = modFileDir + curLine;
							
							try {
								let data = fs.readFileSync(filePath, 'utf8');
								
								parsed.Header.EntryNameFile = curLine;
								
								let lines = data.split('\n');
								for(let line of lines)
								{
									line = line.replace(/\r/, "");   // In case of Windoze.
									parsed.Header.EntryNameList.push(line);
								}
								while(parsed.Header.EntryNameList.length < parsed.Header.EntryCount)
								{
									let entryCtr = parsed.Header.EntryNameList.length;
									parsed.Header.EntryNameList.push(`ENTRY${entryCtr}`);
								}
							} 
							catch(e) 
							{
								window.setStatusMessage(e);
							}
						} 
						else 
						{
							while(parsed.Header.EntryNameList.length < parsed.Header.EntryCount)
							{
								let entryCtr = parsed.Header.EntryNameList.length;
								parsed.Header.EntryNameList.push(`ENTRY${entryCtr}`);
							}
						}
						mode = "TEXTENTRYFILE";
					} 
					else if(mode == "TEXTENTRYFILE")
					{
						// Read entry.
						if(curLine != "NULL")
						{
							console.log("Loading Text Entry file");
							let entry = modFileDir + curLine;
							
							try {
								let data = fs.readFileSync(entry, 'utf8');
								
								this.header.TextEntryFile = curLine;
								
								let lines = data.split('\n');
								for(let line of lines)
								{
									line = line.replace(/\r/, "");   // In case of Window$.
									parsed.Header.TextEntryList.push(line);
								}
							} 
							catch(e) 
							{
								window.setStatusMessage(e);
							}
						}
						mode = "ENTRYDESC";
					} 
					// Entry component states:
					else if(mode == "ENTRYDESC")
					{
						curEntryComponent = new EntryComponent();
						curEntryComponent.EntryInfo = curLine;
						mode = "ENTRYOFFSET";
					} 
					else if(mode == "ENTRYOFFSET")
					{
						curEntryComponent.AddressOffset = parseInt(curLine);
						mode = "ENTRYBYTES";
					} 
					else if(mode == "ENTRYBYTES")
					{
						curEntryComponent.EntrySize = parseInt(curLine);	// 64-bit enabled now
						mode = "ENTRYTYPE";
					} 
					else if(mode == "ENTRYTYPE")
					{
						curEntryComponent.EditElement = curLine;
						mode = "ENTRYPARAM";
					} 
					else if(mode == "ENTRYPARAM")
					{ 
						// Close entry:
						if(curLine != "NULL")
						{
							console.log("Loading Parameter file");
							
							let filePath = modFileDir + curLine;
							try {
								let data = fs.readFileSync(filePath, 'utf8');
								
								curEntryComponent.DropdownFile = curLine;
								
								let lines = data.split('\n').slice(1);  // Thanks to JS, we can skip line 1.
								for(let line of lines)
								{
									line = line.replace(/\r/, "");   // In case of Bill Gates.
									let paramLine = line.match(/^(.+?) (.*)$/m);
									if(paramLine == null)
									{
										continue;
									}
									
									curEntryComponent.DropdownParams.push({
										"value" : parseInt(paramLine[1]),
										"description" : paramLine[2]
									});
								}
							} 
							catch(e) 
							{
								// statements
								window.setStatusMessage(e);
							}
						}
						parsed.EntryComponents.push(Object.assign({}, curEntryComponent));
						mode = "ENTRYDESC";
					}
				}
				
				window.setStatusMessage("Module file successfully parsed (.nmm)");
				
				return parsed;
			}
		}
		parseNMM = parseNMM.bind(this);
		
		function loadModuleFile(paths)
		{
			if(paths === undefined)
			{
				return;
			}
			let path = paths[0];
			
			let data = fs.readFileSync(path, 'utf8');
			
			try
			{
				this.setState({
					ModFiles	: this.state.ModFiles.concat(path),
					curModIndex	: this.state.curModIndex + 1
				});
				
				let nmmObj = parseNMM(data);
				
				this.setState({
					ModData : this.state.ModData.concat(nmmObj)
				});
				
				this.changeModuleIndex(this.state.ModData.length - 1);
			}
			catch(exception)
			{
				window.setStatusMessage(`Exception occurred: ${exception.message}\nThis might mean that you forgot to laod a ROM.`);
				throw exception;
			}
		}
		
		dialog.showOpenDialog({
			title           : "Please Select a Module File",
			buttonLabel     : "Select",
			defaultPath 	: this.state.Config.lastModuleDirectory,
			filters         : [{
								name        : "Nightmare Module File",
								extensions  : ["nmm", "json"]
							}],
			properties    	: ["openFile"]
		}, loadModuleFile.bind(this));
	}
	
	closeModule()
	{
		// Check if any modules are loaded.
		let selComponent = document.getElementById("selComponent");
		
		if(selComponent == null)
		{
			window.setStatusMessage("No modules to unload");
			return;
		}
		
		let whichIndex      = selComponent.value;
		let resultModFiles  = this.state.ModFiles.slice(0,whichIndex).concat(this.state.ModFiles.slice(whichIndex+1));
		let resultModData   = this.state.ModData.slice(0,whichIndex).concat(this.state.ModData.slice(whichIndex+1));
		
		window.setStatusMessage("Module unloaded")
		
		// Moudle at Index no longer exists, we can dec if > 0 and be safe.
		if(this.state.curModIndex > 0)
		{
			this.setState({
				curModIndex : this.state.curModIndex - 1
			});
		} 
		else if(this.state.curModIndex == 0 && resultModFiles.length == 0)
		{ // No more modules left = -1
			this.setState({
				curModIndex : -1
			});
		} 
		else if(this.state.curModIndex < 0)
		{
			return;
		}
		
		this.setState({
			ModFiles	: resultModFiles,
			ModData		: resultModData
		});
	}
	
	convertModuleToJSON(){
		let ModulePath = this.state.ModFiles[this.state.curModIndex];
		
		// Already a JSON file. Don't need to do anything.
		if(ModulePath.search(/\.json$/m) != -1)
		{
			window.setStatusMessage("Current module is already in json format");
			return;
		}
		
		if(ModulePath.search(/\.nmm$/m) == -1)
		{
			ModulePath = ModulePath + ".nmm";		// Just in case.
		}
		
		try
		{
			if(this.state.curModIndex == -1)
			{
				window.setStatusMessage("No module to copy.");
				return;
			}
			
			let JSONstring = JSON.stringify(this.state.ModData[this.state.curModIndex], (key,value)=>
			{
				if(key == "EntryNameList" || key == "TextEntryList" || key == "DropdownParams")
				{
					return;
				}
				return value;
			}, "\t");
			
			ModulePath = ModulePath.replace(/\.nmm$/m, ".json");
			fs.writeFileSync(ModulePath, JSONstring);
			
			window.setStatusMessage(`Conversion done: ${ModulePath}`);
		}
		catch(exception)
		{
			window.setStatusMessage(exception.message);
			throw exception;
		}
	}
	
	changeModuleIndex(idx)
	{
		this.setState({
			curModIndex: idx
		});
	}
	
	writeROMBuffer(addr, bytes)
	{
		let RDB = this.state.ROMDataBuffer;
				
		addr = parseInt(addr);
		
		if(RDB == null || addr >= RDB.length)
		{
			window.setStatusMessage("No ROM has been loaded!");
			return -1;
		}
		
		for(let i=0, len=bytes.length; i<len; i++)
		{
			RDB[addr + i] = bytes[i];
		}
		this.setState({
			ROMDataBuffer: RDB
		});
		
		window.setStatusMessage(`${bytes.length} byte(s) written.`);
		
		return bytes.length;
	}
	
	readROMBuffer(addr, n)
	{
		let arr = [];
		let RDB = this.state.ROMDataBuffer;
		
		addr = parseInt(addr);
		
		if(RDB == null || addr >= RDB.length)
		{
			return;
		}
		
		for(let i=0; i<n; i++)
		{
			arr.push(RDB[addr + i]);
		}

		return arr;
	}
	
	saveROMAs()
	{
		if(this.state.ROMFilePath == "")
		{
			window.setStatusMessage("No file loaded.");
			return;
		}
			
		let ROMfolder = this.state.ROMFilePath.match(/.*[/\\]/);;
		
		function saveROMAsFile(fileName)
		{
			if(fileName === undefined)
			{
				window.setStatusMessage("No file to Save.")
				return;
			}
			
			// Write it:
			fs.writeFileSync(fileName, this.state.ROMDataBuffer);
		}
		
		dialog.showSaveDialog({
			title       : "Save ROM",
			defaultPath : ROMfolder[0],
			buttonLabel : "Save ROM"
		}, saveROMAsFile.bind(this));
	}
	
	render()
	{
		let moduleIndex = this.state.curModIndex;
		let moduleObject = this.state.ModData[moduleIndex];
		
		return <div id="mainInterface">
			<div id="ButtonContainer">
				{/* FYI: the preventDefault stops a bug where if you drag the link button, it freezes.*/}
				<a href="#" onClick={this.selectROM} className="linkButton" onDragStart={(e)=>{e.preventDefault()}}>
					Open ROM...
				</a>
				{" "}
				<a href="#" onClick={this.saveROMAs} className="linkButton" onDragStart={(e)=>{e.preventDefault()}}>
					Save ROM As...
				</a>
			</div>
			<DisplayFilePath id="ROMFileDisp" path={this.state.ROMFilePath} />
			<div id="ButtonContainer">
				<a href="#" onClick={this.openModule} className="linkButton" onDragStart={(e)=>{e.preventDefault()}}>
					Open Module...
				</a>
				{" "}
				<a href="#" onClick={this.closeModule} className="linkButton" onDragStart={(e)=>{e.preventDefault()}}>
					Close Active Module
				</a>
				{" "}
				<a href="#" onClick={this.convertModuleToJSON} className="linkButton" onDragStart={(e)=>{e.preventDefault()}}>
					Convert NMM to JSON
				</a>
			</div>
			<ModuleSelector id="ModFileDisp" moduleData={this.state.ModData} curModIndex={moduleIndex} changeModuleIndex={this.changeModuleIndex} />
			{
				(this.state.curModIndex != -1)?
				(
					<EditorMain id="EditorMain" curModule={moduleObject} modIndex={moduleIndex} writeROMBufferHandler={this.writeROMBuffer} readROMBufferHandler={this.readROMBuffer} />
				)
				: 
				(
					null
				)
			}
		</div>;
	}
}

ReactDOM.render(<RootComponent />, document.getElementById('root'));
