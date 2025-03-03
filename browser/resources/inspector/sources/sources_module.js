Sources.AddSourceMapURLDialog=class extends UI.HBox{constructor(callback){super(true);this.registerRequiredCSS('sources/dialog.css');this.contentElement.createChild('label').textContent=Common.UIString('Source map URL: ');this._input=UI.createInput();this.contentElement.appendChild(this._input);this._input.setAttribute('type','text');this._input.addEventListener('keydown',this._onKeyDown.bind(this),false);const addButton=this.contentElement.createChild('button');addButton.textContent=Common.UIString('Add');addButton.addEventListener('click',this._apply.bind(this),false);this.setDefaultFocusedElement(this._input);this._callback=callback;this.contentElement.tabIndex=0;}
static show(callback){const dialog=new UI.Dialog();const addSourceMapURLDialog=new Sources.AddSourceMapURLDialog(done);addSourceMapURLDialog.show(dialog.contentElement);dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);dialog.show();function done(value){dialog.hide();callback(value);}}
_apply(){this._callback(this._input.value);}
_onKeyDown(event){if(event.keyCode===UI.KeyboardShortcut.Keys.Enter.code){event.preventDefault();this._apply();}}};;Sources.BreakpointEditDialog=class extends UI.Widget{constructor(editorLineNumber,oldCondition,preferLogpoint,onFinish){super(true);this.registerRequiredCSS('sources/breakpointEditDialog.css');this._onFinish=onFinish;this._finished=false;this._editor=null;this.element.tabIndex=-1;const logpointPrefix=Sources.BreakpointEditDialog.LogpointPrefix;const logpointSuffix=Sources.BreakpointEditDialog._LogpointSuffix;this._isLogpoint=oldCondition.startsWith(logpointPrefix)&&oldCondition.endsWith(logpointSuffix);if(this._isLogpoint)
oldCondition=oldCondition.substring(logpointPrefix.length,oldCondition.length-logpointSuffix.length);this._isLogpoint=this._isLogpoint||preferLogpoint;this.element.classList.add('sources-edit-breakpoint-dialog');const toolbar=new UI.Toolbar('source-frame-breakpoint-toolbar',this.contentElement);toolbar.appendText(`Line ${editorLineNumber + 1}:`);this._typeSelector=new UI.ToolbarComboBox(this._onTypeChanged.bind(this));this._typeSelector.createOption(ls`Breakpoint`,'',Sources.BreakpointEditDialog.BreakpointType.Breakpoint);const conditionalOption=this._typeSelector.createOption(ls`Conditional breakpoint`,'',Sources.BreakpointEditDialog.BreakpointType.Conditional);const logpointOption=this._typeSelector.createOption(ls`Logpoint`,'',Sources.BreakpointEditDialog.BreakpointType.Logpoint);this._typeSelector.select(this._isLogpoint?logpointOption:conditionalOption);toolbar.appendToolbarItem(this._typeSelector);self.runtime.extension(UI.TextEditorFactory).instance().then(factory=>{const editorOptions={lineNumbers:false,lineWrapping:true,mimeType:'javascript',autoHeight:true};this._editor=factory.createEditor(editorOptions);this._updatePlaceholder();this._editor.widget().element.classList.add('condition-editor');this._editor.configureAutocomplete(ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));if(oldCondition)
this._editor.setText(oldCondition);this._editor.widget().show(this.contentElement);this._editor.setSelection(this._editor.fullRange());this._editor.widget().focus();this._editor.widget().element.addEventListener('keydown',this._onKeyDown.bind(this),true);this.contentElement.addEventListener('blur',event=>{if(event.relatedTarget&&!event.relatedTarget.isSelfOrDescendant(this.element))
this._finishEditing(true);},true);});}
static _conditionForLogpoint(condition){return`${Sources.BreakpointEditDialog.LogpointPrefix}${condition}${Sources.BreakpointEditDialog._LogpointSuffix}`;}
_onTypeChanged(){const value=this._typeSelector.selectedOption().value;this._isLogpoint=value===Sources.BreakpointEditDialog.BreakpointType.Logpoint;this._updatePlaceholder();if(value===Sources.BreakpointEditDialog.BreakpointType.Breakpoint){this._editor.setText('');this._finishEditing(true);}}
_updatePlaceholder(){const selectedValue=this._typeSelector.selectedOption().value;if(selectedValue===Sources.BreakpointEditDialog.BreakpointType.Conditional){this._editor.setPlaceholder(ls`Expression to check before pausing, e.g. x > 5`);this._typeSelector.element.title=ls`Pause only when the condition is true`;}else if(selectedValue===Sources.BreakpointEditDialog.BreakpointType.Logpoint){this._editor.setPlaceholder(ls`Log message, e.g. 'x is', x`);this._typeSelector.element.title=ls`Log a message to Console, do not break`;}}
_finishEditing(committed){if(this._finished)
return;this._finished=true;this._editor.widget().detach();let condition=this._editor.text();if(this._isLogpoint)
condition=Sources.BreakpointEditDialog._conditionForLogpoint(condition);this._onFinish({committed,condition});}
async _onKeyDown(event){if(isEnterKey(event)&&!event.shiftKey){event.consume(true);const expression=this._editor.text();if(event.ctrlKey||await ObjectUI.JavaScriptAutocomplete.isExpressionComplete(expression))
this._finishEditing(true);else
this._editor.newlineAndIndent();}
if(isEscKey(event))
this._finishEditing(false);}};Sources.BreakpointEditDialog.LogpointPrefix='/** DEVTOOLS_LOGPOINT */ console.log(';Sources.BreakpointEditDialog._LogpointSuffix=')';Sources.BreakpointEditDialog.BreakpointType={Breakpoint:'Breakpoint',Conditional:'Conditional',Logpoint:'Logpoint',};;Sources.CallStackSidebarPane=class extends UI.SimpleView{constructor(){super(Common.UIString('Call Stack'),true);this.registerRequiredCSS('sources/callStackSidebarPane.css');this._blackboxedMessageElement=this._createBlackboxedMessageElement();this.contentElement.appendChild(this._blackboxedMessageElement);this._notPausedMessageElement=this.contentElement.createChild('div','gray-info-message');this._notPausedMessageElement.textContent=Common.UIString('Not paused');this._items=new UI.ListModel();this._list=new UI.ListControl(this._items,this,UI.ListMode.NonViewport);this.contentElement.appendChild(this._list.element);this._list.element.addEventListener('contextmenu',this._onContextMenu.bind(this),false);this._list.element.addEventListener('click',this._onClick.bind(this),false);this._showMoreMessageElement=this._createShowMoreMessageElement();this._showMoreMessageElement.classList.add('hidden');this.contentElement.appendChild(this._showMoreMessageElement);this._showBlackboxed=false;this._locationPool=new Bindings.LiveLocationPool();this._updateThrottler=new Common.Throttler(100);this._maxAsyncStackChainDepth=Sources.CallStackSidebarPane._defaultMaxAsyncStackChainDepth;this._update();this._updateItemThrottler=new Common.Throttler(100);this._scheduledForUpdateItems=new Set();}
flavorChanged(object){this._showBlackboxed=false;this._maxAsyncStackChainDepth=Sources.CallStackSidebarPane._defaultMaxAsyncStackChainDepth;this._update();}
_update(){this._updateThrottler.schedule(()=>this._doUpdate());}
async _doUpdate(){this._locationPool.disposeAll();const details=UI.context.flavor(SDK.DebuggerPausedDetails);if(!details){this._notPausedMessageElement.classList.remove('hidden');this._blackboxedMessageElement.classList.add('hidden');this._showMoreMessageElement.classList.add('hidden');this._items.replaceAll([]);UI.context.setFlavor(SDK.DebuggerModel.CallFrame,null);return;}
let debuggerModel=details.debuggerModel;this._notPausedMessageElement.classList.add('hidden');const items=details.callFrames.map(frame=>{const item=Sources.CallStackSidebarPane.Item.createForDebuggerCallFrame(frame,this._locationPool,this._refreshItem.bind(this));item[Sources.CallStackSidebarPane._debuggerCallFrameSymbol]=frame;return item;});let asyncStackTrace=details.asyncStackTrace;if(!asyncStackTrace&&details.asyncStackTraceId){if(details.asyncStackTraceId.debuggerId)
debuggerModel=SDK.DebuggerModel.modelForDebuggerId(details.asyncStackTraceId.debuggerId);asyncStackTrace=debuggerModel?await debuggerModel.fetchAsyncStackTrace(details.asyncStackTraceId):null;}
let peviousStackTrace=details.callFrames;let maxAsyncStackChainDepth=this._maxAsyncStackChainDepth;while(asyncStackTrace&&maxAsyncStackChainDepth>0){let title='';const isAwait=asyncStackTrace.description==='async function';if(isAwait&&peviousStackTrace.length&&asyncStackTrace.callFrames.length){const lastPreviousFrame=peviousStackTrace[peviousStackTrace.length-1];const lastPreviousFrameName=UI.beautifyFunctionName(lastPreviousFrame.functionName);title=UI.asyncStackTraceLabel('await in '+lastPreviousFrameName);}else{title=UI.asyncStackTraceLabel(asyncStackTrace.description);}
items.push(...Sources.CallStackSidebarPane.Item.createItemsForAsyncStack(title,debuggerModel,asyncStackTrace.callFrames,this._locationPool,this._refreshItem.bind(this)));--maxAsyncStackChainDepth;peviousStackTrace=asyncStackTrace.callFrames;if(asyncStackTrace.parent){asyncStackTrace=asyncStackTrace.parent;}else if(asyncStackTrace.parentId){if(asyncStackTrace.parentId.debuggerId)
debuggerModel=SDK.DebuggerModel.modelForDebuggerId(asyncStackTrace.parentId.debuggerId);asyncStackTrace=debuggerModel?await debuggerModel.fetchAsyncStackTrace(asyncStackTrace.parentId):null;}else{asyncStackTrace=null;}}
this._showMoreMessageElement.classList.toggle('hidden',!asyncStackTrace);this._items.replaceAll(items);if(this._maxAsyncStackChainDepth===Sources.CallStackSidebarPane._defaultMaxAsyncStackChainDepth)
this._list.selectNextItem(true,false);this._updatedForTest();}
_updatedForTest(){}
_refreshItem(item){this._scheduledForUpdateItems.add(item);this._updateItemThrottler.schedule(innerUpdate.bind(this));function innerUpdate(){const items=Array.from(this._scheduledForUpdateItems);this._scheduledForUpdateItems.clear();this._muteActivateItem=true;if(!this._showBlackboxed&&this._items.every(item=>item.isBlackboxed)){this._showBlackboxed=true;for(let i=0;i<this._items.length;++i)
this._list.refreshItemByIndex(i);this._blackboxedMessageElement.classList.toggle('hidden',true);}else{const itemsSet=new Set(items);let hasBlackboxed=false;for(let i=0;i<this._items.length;++i){const item=this._items.at(i);if(itemsSet.has(item))
this._list.refreshItemByIndex(i);hasBlackboxed=hasBlackboxed||item.isBlackboxed;}
this._blackboxedMessageElement.classList.toggle('hidden',this._showBlackboxed||!hasBlackboxed);}
delete this._muteActivateItem;return Promise.resolve();}}
createElementForItem(item){const element=createElementWithClass('div','call-frame-item');const title=element.createChild('div','call-frame-item-title');title.createChild('div','call-frame-title-text').textContent=item.title;if(item.isAsyncHeader){element.classList.add('async-header');}else{const linkElement=element.createChild('div','call-frame-location');linkElement.textContent=item.linkText.trimMiddle(30);linkElement.title=item.linkText;element.classList.toggle('blackboxed-call-frame',item.isBlackboxed);}
element.classList.toggle('hidden',!this._showBlackboxed&&item.isBlackboxed);element.appendChild(UI.Icon.create('smallicon-thick-right-arrow','selected-call-frame-icon'));return element;}
heightForItem(item){console.assert(false);return 0;}
isItemSelectable(item){return!!item[Sources.CallStackSidebarPane._debuggerCallFrameSymbol];}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('selected');if(toElement)
toElement.classList.add('selected');if(to)
this._activateItem(to);}
_createBlackboxedMessageElement(){const element=createElementWithClass('div','blackboxed-message');element.createChild('span');const showAllLink=element.createChild('span','link');showAllLink.textContent=Common.UIString('Show blackboxed frames');showAllLink.addEventListener('click',()=>{this._showBlackboxed=true;for(const item of this._items)
this._refreshItem(item);this._blackboxedMessageElement.classList.toggle('hidden',true);});return element;}
_createShowMoreMessageElement(){const element=createElementWithClass('div','show-more-message');element.createChild('span');const showAllLink=element.createChild('span','link');showAllLink.textContent=Common.UIString('Show more');showAllLink.addEventListener('click',()=>{this._maxAsyncStackChainDepth+=Sources.CallStackSidebarPane._defaultMaxAsyncStackChainDepth;this._update();},false);return element;}
_onContextMenu(event){const item=this._list.itemForNode((event.target));if(!item)
return;const contextMenu=new UI.ContextMenu(event);const debuggerCallFrame=item[Sources.CallStackSidebarPane._debuggerCallFrameSymbol];if(debuggerCallFrame)
contextMenu.defaultSection().appendItem(Common.UIString('Restart frame'),()=>debuggerCallFrame.restart());contextMenu.defaultSection().appendItem(Common.UIString('Copy stack trace'),this._copyStackTrace.bind(this));if(item.uiLocation)
this.appendBlackboxURLContextMenuItems(contextMenu,item.uiLocation.uiSourceCode);contextMenu.show();}
_onClick(event){const item=this._list.itemForNode((event.target));if(item)
this._activateItem(item);}
_activateItem(item){const uiLocation=item.uiLocation;if(this._muteActivateItem||!uiLocation)
return;const debuggerCallFrame=item[Sources.CallStackSidebarPane._debuggerCallFrameSymbol];if(debuggerCallFrame&&UI.context.flavor(SDK.DebuggerModel.CallFrame)!==debuggerCallFrame){debuggerCallFrame.debuggerModel.setSelectedCallFrame(debuggerCallFrame);UI.context.setFlavor(SDK.DebuggerModel.CallFrame,debuggerCallFrame);}else{Common.Revealer.reveal(uiLocation);}}
appendBlackboxURLContextMenuItems(contextMenu,uiSourceCode){const binding=Persistence.persistence.binding(uiSourceCode);if(binding)
uiSourceCode=binding.network;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem)
return;const canBlackbox=Bindings.blackboxManager.canBlackboxUISourceCode(uiSourceCode);const isBlackboxed=Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode);const isContentScript=uiSourceCode.project().type()===Workspace.projectTypes.ContentScripts;const manager=Bindings.blackboxManager;if(canBlackbox){if(isBlackboxed){contextMenu.defaultSection().appendItem(Common.UIString('Stop blackboxing'),manager.unblackboxUISourceCode.bind(manager,uiSourceCode));}else{contextMenu.defaultSection().appendItem(Common.UIString('Blackbox script'),manager.blackboxUISourceCode.bind(manager,uiSourceCode));}}
if(isContentScript){if(isBlackboxed){contextMenu.defaultSection().appendItem(Common.UIString('Stop blackboxing all content scripts'),manager.blackboxContentScripts.bind(manager));}else{contextMenu.defaultSection().appendItem(Common.UIString('Blackbox all content scripts'),manager.unblackboxContentScripts.bind(manager));}}}
_selectNextCallFrameOnStack(){return this._list.selectNextItem(false,false);}
_selectPreviousCallFrameOnStack(){return this._list.selectPreviousItem(false,false);}
_copyStackTrace(){const text=[];for(const item of this._items){let itemText=item.title;if(item.uiLocation)
itemText+=' ('+item.uiLocation.linkText(true)+')';text.push(itemText);}
InspectorFrontendHost.copyText(text.join('\n'));}};Sources.CallStackSidebarPane._debuggerCallFrameSymbol=Symbol('debuggerCallFrame');Sources.CallStackSidebarPane._elementSymbol=Symbol('element');Sources.CallStackSidebarPane._defaultMaxAsyncStackChainDepth=32;Sources.CallStackSidebarPane.ActionDelegate=class{handleAction(context,actionId){const callStackSidebarPane=self.runtime.sharedInstance(Sources.CallStackSidebarPane);switch(actionId){case'debugger.next-call-frame':callStackSidebarPane._selectNextCallFrameOnStack();return true;case'debugger.previous-call-frame':callStackSidebarPane._selectPreviousCallFrameOnStack();return true;}
return false;}};Sources.CallStackSidebarPane.Item=class{static createForDebuggerCallFrame(frame,locationPool,updateDelegate){const item=new Sources.CallStackSidebarPane.Item(UI.beautifyFunctionName(frame.functionName),updateDelegate);Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(frame.location(),item._update.bind(item),locationPool);return item;}
static createItemsForAsyncStack(title,debuggerModel,frames,locationPool,updateDelegate){const whiteboxedItemsSymbol=Symbol('whiteboxedItems');const asyncHeaderItem=new Sources.CallStackSidebarPane.Item(title,updateDelegate);asyncHeaderItem[whiteboxedItemsSymbol]=new Set();asyncHeaderItem.isAsyncHeader=true;const asyncFrameItems=frames.map(frame=>{const item=new Sources.CallStackSidebarPane.Item(UI.beautifyFunctionName(frame.functionName),update);const rawLocation=debuggerModel?debuggerModel.createRawLocationByScriptId(frame.scriptId,frame.lineNumber,frame.columnNumber):null;if(!rawLocation){item.linkText=(frame.url||'<unknown>')+':'+(frame.lineNumber+1);item.updateDelegate(item);}else{Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(rawLocation,item._update.bind(item),locationPool);}
return item;});updateDelegate(asyncHeaderItem);return[asyncHeaderItem,...asyncFrameItems];function update(item){updateDelegate(item);let shouldUpdate=false;const items=asyncHeaderItem[whiteboxedItemsSymbol];if(item.isBlackboxed){items.delete(item);shouldUpdate=items.size===0;}else{shouldUpdate=items.size===0;items.add(item);}
asyncHeaderItem.isBlackboxed=asyncHeaderItem[whiteboxedItemsSymbol].size===0;if(shouldUpdate)
updateDelegate(asyncHeaderItem);}}
constructor(title,updateDelegate){this.isBlackboxed=false;this.title=title;this.linkText='';this.uiLocation=null;this.isAsyncHeader=false;this.updateDelegate=updateDelegate;}
_update(liveLocation){const uiLocation=liveLocation.uiLocation();this.isBlackboxed=uiLocation?Bindings.blackboxManager.isBlackboxedUISourceCode(uiLocation.uiSourceCode):false;this.linkText=uiLocation?uiLocation.linkText():'';this.uiLocation=uiLocation;this.updateDelegate(this);}};;Sources.DebuggerPausedMessage=class{constructor(){this._element=createElementWithClass('div','paused-message flex-none');const root=UI.createShadowRootWithCoreStyles(this._element,'sources/debuggerPausedMessage.css');this._contentElement=root.createChild('div');}
element(){return this._element;}
static _descriptionWithoutStack(description){const firstCallFrame=/^\s+at\s/m.exec(description);return firstCallFrame?description.substring(0,firstCallFrame.index-1):description.substring(0,description.lastIndexOf('\n'));}
static async _createDOMBreakpointHitMessage(details){const messageWrapper=createElement('span');const domDebuggerModel=details.debuggerModel.target().model(SDK.DOMDebuggerModel);if(!details.auxData||!domDebuggerModel)
return messageWrapper;const data=domDebuggerModel.resolveDOMBreakpointData((details.auxData));if(!data)
return messageWrapper;const mainElement=messageWrapper.createChild('div','status-main');mainElement.appendChild(UI.Icon.create('smallicon-info','status-icon'));const breakpointType=Sources.DebuggerPausedMessage.BreakpointTypeNouns.get(data.type);mainElement.appendChild(createTextNode(ls`Paused on ${breakpointType}`));const subElement=messageWrapper.createChild('div','status-sub monospace');const linkifiedNode=await Common.Linkifier.linkify(data.node);subElement.appendChild(linkifiedNode);if(data.targetNode){const targetNodeLink=await Common.Linkifier.linkify(data.targetNode);let messageElement;if(data.insertion){if(data.targetNode===data.node)
messageElement=UI.formatLocalized('Child %s added',[targetNodeLink]);else
messageElement=UI.formatLocalized('Descendant %s added',[targetNodeLink]);}else{messageElement=UI.formatLocalized('Descendant %s removed',[targetNodeLink]);}
subElement.appendChild(createElement('br'));subElement.appendChild(messageElement);}
return messageWrapper;}
async render(details,debuggerWorkspaceBinding,breakpointManager){this._contentElement.removeChildren();this._contentElement.hidden=!details;if(!details)
return;const status=this._contentElement.createChild('div','paused-status');const errorLike=details.reason===SDK.DebuggerModel.BreakReason.Exception||details.reason===SDK.DebuggerModel.BreakReason.PromiseRejection||details.reason===SDK.DebuggerModel.BreakReason.Assert||details.reason===SDK.DebuggerModel.BreakReason.OOM;let messageWrapper;if(details.reason===SDK.DebuggerModel.BreakReason.DOM){messageWrapper=await Sources.DebuggerPausedMessage._createDOMBreakpointHitMessage(details);}else if(details.reason===SDK.DebuggerModel.BreakReason.EventListener){let eventNameForUI='';if(details.auxData){eventNameForUI=SDK.domDebuggerManager.resolveEventListenerBreakpointTitle((details.auxData));}
messageWrapper=buildWrapper(Common.UIString('Paused on event listener'),eventNameForUI);}else if(details.reason===SDK.DebuggerModel.BreakReason.XHR){messageWrapper=buildWrapper(Common.UIString('Paused on XHR or fetch'),details.auxData['url']||'');}else if(details.reason===SDK.DebuggerModel.BreakReason.Exception){const description=details.auxData['description']||details.auxData['value']||'';const descriptionWithoutStack=Sources.DebuggerPausedMessage._descriptionWithoutStack(description);messageWrapper=buildWrapper(Common.UIString('Paused on exception'),descriptionWithoutStack,description);}else if(details.reason===SDK.DebuggerModel.BreakReason.PromiseRejection){const description=details.auxData['description']||details.auxData['value']||'';const descriptionWithoutStack=Sources.DebuggerPausedMessage._descriptionWithoutStack(description);messageWrapper=buildWrapper(Common.UIString('Paused on promise rejection'),descriptionWithoutStack,description);}else if(details.reason===SDK.DebuggerModel.BreakReason.Assert){messageWrapper=buildWrapper(Common.UIString('Paused on assertion'));}else if(details.reason===SDK.DebuggerModel.BreakReason.DebugCommand){messageWrapper=buildWrapper(Common.UIString('Paused on debugged function'));}else if(details.reason===SDK.DebuggerModel.BreakReason.OOM){messageWrapper=buildWrapper(Common.UIString('Paused before potential out-of-memory crash'));}else if(details.callFrames.length){const uiLocation=debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location());const breakpoint=uiLocation?breakpointManager.findBreakpoint(uiLocation):null;const defaultText=breakpoint?Common.UIString('Paused on breakpoint'):Common.UIString('Debugger paused');messageWrapper=buildWrapper(defaultText);}else{console.warn('ScriptsPanel paused, but callFrames.length is zero.');}
status.classList.toggle('error-reason',errorLike);if(messageWrapper)
status.appendChild(messageWrapper);function buildWrapper(mainText,subText,title){const messageWrapper=createElement('span');const mainElement=messageWrapper.createChild('div','status-main');const icon=UI.Icon.create(errorLike?'smallicon-error':'smallicon-info','status-icon');mainElement.appendChild(icon);mainElement.appendChild(createTextNode(mainText));if(subText){const subElement=messageWrapper.createChild('div','status-sub monospace');subElement.textContent=subText;subElement.title=title||subText;}
return messageWrapper;}}};Sources.DebuggerPausedMessage.BreakpointTypeNouns=new Map([[SDK.DOMDebuggerModel.DOMBreakpoint.Type.SubtreeModified,Common.UIString('subtree modifications')],[SDK.DOMDebuggerModel.DOMBreakpoint.Type.AttributeModified,Common.UIString('attribute modifications')],[SDK.DOMDebuggerModel.DOMBreakpoint.Type.NodeRemoved,Common.UIString('node removal')],]);;Sources.HistoryEntry=function(){};Sources.HistoryEntry.prototype={valid(){},reveal(){}};Sources.SimpleHistoryManager=class{constructor(historyDepth){this._entries=[];this._activeEntryIndex=-1;this._coalescingReadonly=0;this._historyDepth=historyDepth;}
readOnlyLock(){++this._coalescingReadonly;}
releaseReadOnlyLock(){--this._coalescingReadonly;}
readOnly(){return!!this._coalescingReadonly;}
filterOut(filterOutCallback){if(this.readOnly())
return;const filteredEntries=[];let removedBeforeActiveEntry=0;for(let i=0;i<this._entries.length;++i){if(!filterOutCallback(this._entries[i]))
filteredEntries.push(this._entries[i]);else if(i<=this._activeEntryIndex)
++removedBeforeActiveEntry;}
this._entries=filteredEntries;this._activeEntryIndex=Math.max(0,this._activeEntryIndex-removedBeforeActiveEntry);}
empty(){return!this._entries.length;}
active(){return this.empty()?null:this._entries[this._activeEntryIndex];}
push(entry){if(this.readOnly())
return;if(!this.empty())
this._entries.splice(this._activeEntryIndex+1);this._entries.push(entry);if(this._entries.length>this._historyDepth)
this._entries.shift();this._activeEntryIndex=this._entries.length-1;}
rollback(){if(this.empty())
return false;let revealIndex=this._activeEntryIndex-1;while(revealIndex>=0&&!this._entries[revealIndex].valid())
--revealIndex;if(revealIndex<0)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;}
rollover(){let revealIndex=this._activeEntryIndex+1;while(revealIndex<this._entries.length&&!this._entries[revealIndex].valid())
++revealIndex;if(revealIndex>=this._entries.length)
return false;this.readOnlyLock();this._entries[revealIndex].reveal();this.releaseReadOnlyLock();this._activeEntryIndex=revealIndex;return true;}};;Sources.EditingLocationHistoryManager=class{constructor(sourcesView,currentSourceFrameCallback){this._sourcesView=sourcesView;this._historyManager=new Sources.SimpleHistoryManager(Sources.EditingLocationHistoryManager.HistoryDepth);this._currentSourceFrameCallback=currentSourceFrameCallback;}
trackSourceFrameCursorJumps(sourceFrame){sourceFrame.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.JumpHappened,this._onJumpHappened.bind(this));}
_onJumpHappened(event){if(event.data.from)
this._updateActiveState(event.data.from);if(event.data.to)
this._pushActiveState(event.data.to);}
rollback(){this._historyManager.rollback();}
rollover(){this._historyManager.rollover();}
updateCurrentState(){const sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._updateActiveState(sourceFrame.textEditor.selection());}
pushNewState(){const sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;this._pushActiveState(sourceFrame.textEditor.selection());}
_updateActiveState(selection){const active=this._historyManager.active();if(!active)
return;const sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;const entry=new Sources.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);active.merge(entry);}
_pushActiveState(selection){const sourceFrame=this._currentSourceFrameCallback();if(!sourceFrame)
return;const entry=new Sources.EditingLocationHistoryEntry(this._sourcesView,this,sourceFrame,selection);this._historyManager.push(entry);}
removeHistoryForSourceCode(uiSourceCode){function filterOut(entry){return entry._projectId===uiSourceCode.project().id()&&entry._url===uiSourceCode.url();}
this._historyManager.filterOut(filterOut);}};Sources.EditingLocationHistoryManager.HistoryDepth=20;Sources.EditingLocationHistoryEntry=class{constructor(sourcesView,editingLocationManager,sourceFrame,selection){this._sourcesView=sourcesView;this._editingLocationManager=editingLocationManager;const uiSourceCode=sourceFrame.uiSourceCode();this._projectId=uiSourceCode.project().id();this._url=uiSourceCode.url();const position=this._positionFromSelection(selection);this._positionHandle=sourceFrame.textEditor.textEditorPositionHandle(position.lineNumber,position.columnNumber);}
merge(entry){if(this._projectId!==entry._projectId||this._url!==entry._url)
return;this._positionHandle=entry._positionHandle;}
_positionFromSelection(selection){return{lineNumber:selection.endLine,columnNumber:selection.endColumn};}
valid(){const position=this._positionHandle.resolve();const uiSourceCode=Workspace.workspace.uiSourceCode(this._projectId,this._url);return!!(position&&uiSourceCode);}
reveal(){const position=this._positionHandle.resolve();const uiSourceCode=Workspace.workspace.uiSourceCode(this._projectId,this._url);if(!position||!uiSourceCode)
return;this._editingLocationManager.updateCurrentState();this._sourcesView.showSourceLocation(uiSourceCode,position.lineNumber,position.columnNumber);}};;Sources.FilePathScoreFunction=class{constructor(query){this._query=query;this._queryUpperCase=query.toUpperCase();this._score=new Int32Array(20*100);this._sequence=new Int32Array(20*100);this._dataUpperCase='';this._fileNameIndex=0;}
score(data,matchIndexes){if(!data||!this._query)
return 0;const n=this._query.length;const m=data.length;if(!this._score||this._score.length<n*m){this._score=new Int32Array(n*m*2);this._sequence=new Int32Array(n*m*2);}
const score=this._score;const sequence=(this._sequence);this._dataUpperCase=data.toUpperCase();this._fileNameIndex=data.lastIndexOf('/');for(let i=0;i<n;++i){for(let j=0;j<m;++j){const skipCharScore=j===0?0:score[i*m+j-1];const prevCharScore=i===0||j===0?0:score[(i-1)*m+j-1];const consecutiveMatch=i===0||j===0?0:sequence[(i-1)*m+j-1];const pickCharScore=this._match(this._query,data,i,j,consecutiveMatch);if(pickCharScore&&prevCharScore+pickCharScore>=skipCharScore){sequence[i*m+j]=consecutiveMatch+1;score[i*m+j]=(prevCharScore+pickCharScore);}else{sequence[i*m+j]=0;score[i*m+j]=skipCharScore;}}}
if(matchIndexes)
this._restoreMatchIndexes(sequence,n,m,matchIndexes);const maxDataLength=256;return score[n*m-1]*maxDataLength+(maxDataLength-data.length);}
_testWordStart(data,j){if(j===0)
return true;const prevChar=data.charAt(j-1);return prevChar==='_'||prevChar==='-'||prevChar==='/'||(data[j-1]!==this._dataUpperCase[j-1]&&data[j]===this._dataUpperCase[j]);}
_restoreMatchIndexes(sequence,n,m,out){let i=n-1,j=m-1;while(i>=0&&j>=0){switch(sequence[i*m+j]){case 0:--j;break;default:out.push(j);--i;--j;break;}}
out.reverse();}
_singleCharScore(query,data,i,j){const isWordStart=this._testWordStart(data,j);const isFileName=j>this._fileNameIndex;const isPathTokenStart=j===0||data[j-1]==='/';const isCapsMatch=query[i]===data[j]&&query[i]===this._queryUpperCase[i];let score=10;if(isPathTokenStart)
score+=4;if(isWordStart)
score+=2;if(isCapsMatch)
score+=6;if(isFileName)
score+=4;if(j===this._fileNameIndex+1&&i===0)
score+=5;if(isFileName&&isWordStart)
score+=3;return score;}
_sequenceCharScore(query,data,i,j,sequenceLength){const isFileName=j>this._fileNameIndex;const isPathTokenStart=j===0||data[j-1]==='/';let score=10;if(isFileName)
score+=4;if(isPathTokenStart)
score+=5;score+=sequenceLength*4;return score;}
_match(query,data,i,j,consecutiveMatch){if(this._queryUpperCase[i]!==this._dataUpperCase[j])
return 0;if(!consecutiveMatch)
return this._singleCharScore(query,data,i,j);else
return this._sequenceCharScore(query,data,i,j-consecutiveMatch,consecutiveMatch);}};;Sources.FilteredUISourceCodeListProvider=class extends QuickOpen.FilteredListWidget.Provider{constructor(){super();this._queryLineNumberAndColumnNumber='';this._defaultScores=null;this._scorer=new Sources.FilePathScoreFunction('');}
_projectRemoved(event){const project=(event.data);this._populate(project);this.refresh();}
_populate(skipProject){this._uiSourceCodes=[];const projects=Workspace.workspace.projects().filter(this.filterProject.bind(this));for(let i=0;i<projects.length;++i){if(skipProject&&projects[i]===skipProject)
continue;const uiSourceCodes=projects[i].uiSourceCodes().filter(this._filterUISourceCode.bind(this));this._uiSourceCodes=this._uiSourceCodes.concat(uiSourceCodes);}}
_filterUISourceCode(uiSourceCode){const binding=Persistence.persistence.binding(uiSourceCode);return!binding||binding.fileSystem===uiSourceCode;}
uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber){}
filterProject(project){return true;}
itemCount(){return this._uiSourceCodes.length;}
itemKeyAt(itemIndex){return this._uiSourceCodes[itemIndex].url();}
setDefaultScores(defaultScores){this._defaultScores=defaultScores;}
itemScoreAt(itemIndex,query){const uiSourceCode=this._uiSourceCodes[itemIndex];const score=this._defaultScores?(this._defaultScores.get(uiSourceCode)||0):0;if(!query||query.length<2)
return score;if(this._query!==query){this._query=query;this._scorer=new Sources.FilePathScoreFunction(query);}
let multiplier=10;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem&&!Persistence.persistence.binding(uiSourceCode))
multiplier=5;const fullDisplayName=uiSourceCode.fullDisplayName();return score+multiplier*this._scorer.score(fullDisplayName,null);}
renderItem(itemIndex,query,titleElement,subtitleElement){query=this.rewriteQuery(query);const uiSourceCode=this._uiSourceCodes[itemIndex];const fullDisplayName=uiSourceCode.fullDisplayName();const indexes=[];new Sources.FilePathScoreFunction(query).score(fullDisplayName,indexes);const fileNameIndex=fullDisplayName.lastIndexOf('/');titleElement.classList.add('monospace');subtitleElement.classList.add('monospace');titleElement.textContent=uiSourceCode.displayName()+(this._queryLineNumberAndColumnNumber||'');this._renderSubtitleElement(subtitleElement,fullDisplayName);subtitleElement.title=fullDisplayName;const ranges=[];for(let i=0;i<indexes.length;++i)
ranges.push({offset:indexes[i],length:1});if(indexes[0]>fileNameIndex){for(let i=0;i<ranges.length;++i)
ranges[i].offset-=fileNameIndex+1;UI.highlightRangesWithStyleClass(titleElement,ranges,'highlight');}else{UI.highlightRangesWithStyleClass(subtitleElement,ranges,'highlight');}}
_renderSubtitleElement(element,text){element.removeChildren();let splitPosition=text.lastIndexOf('/');if(text.length>55)
splitPosition=text.length-55;const first=element.createChild('div','first-part');first.textContent=text.substring(0,splitPosition);const second=element.createChild('div','second-part');second.textContent=text.substring(splitPosition);element.title=text;}
selectItem(itemIndex,promptValue){const parsedExpression=promptValue.trim().match(/^([^:]*)(:\d+)?(:\d+)?$/);if(!parsedExpression)
return;let lineNumber;let columnNumber;if(parsedExpression[2])
lineNumber=parseInt(parsedExpression[2].substr(1),10)-1;if(parsedExpression[3])
columnNumber=parseInt(parsedExpression[3].substr(1),10)-1;const uiSourceCode=itemIndex!==null?this._uiSourceCodes[itemIndex]:null;this.uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber);}
rewriteQuery(query){query=query?query.trim():'';if(!query||query===':')
return'';const lineNumberMatch=query.match(/^([^:]+)((?::[^:]*){0,2})$/);this._queryLineNumberAndColumnNumber=lineNumberMatch?lineNumberMatch[2]:'';return lineNumberMatch?lineNumberMatch[1]:query;}
_uiSourceCodeAdded(event){const uiSourceCode=(event.data);if(!this._filterUISourceCode(uiSourceCode)||!this.filterProject(uiSourceCode.project()))
return;this._uiSourceCodes.push(uiSourceCode);this.refresh();}
notFoundText(){return Common.UIString('No files found');}
attach(){Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);Workspace.workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);this._populate();}
detach(){Workspace.workspace.removeEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);Workspace.workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved,this);this._queryLineNumberAndColumnNumber='';this._defaultScores=null;}};;Sources.GoToLineQuickOpen=class extends QuickOpen.FilteredListWidget.Provider{selectItem(itemIndex,promptValue){const uiSourceCode=this._currentUISourceCode();if(!uiSourceCode)
return;const position=this._parsePosition(promptValue);if(!position)
return;Common.Revealer.reveal(uiSourceCode.uiLocation(position.line-1,position.column-1));}
notFoundText(query){if(!this._currentUISourceCode())
return Common.UIString('No file selected.');const position=this._parsePosition(query);if(!position)
return Common.UIString('Type a number to go to that line.');if(position.column&&position.column>1)
return ls`Go to line ${position.line} and column ${position.column}.`;return ls`Go to line ${position.line}.`;}
_parsePosition(query){const parts=query.match(/([0-9]+)(\:[0-9]*)?/);if(!parts||!parts[0]||parts[0].length!==query.length)
return null;const line=parseInt(parts[1],10);let column;if(parts[2])
column=parseInt(parts[2].substring(1),10);return{line:Math.max(line|0,1),column:Math.max(column|0,1)};}
_currentUISourceCode(){const sourcesView=UI.context.flavor(Sources.SourcesView);if(!sourcesView)
return null;return sourcesView.currentUISourceCode();}};;Sources.SourceMapNamesResolver={};Sources.SourceMapNamesResolver._cachedMapSymbol=Symbol('cache');Sources.SourceMapNamesResolver._cachedIdentifiersSymbol=Symbol('cachedIdentifiers');Sources.SourceMapNamesResolver.Identifier=class{constructor(name,lineNumber,columnNumber){this.name=name;this.lineNumber=lineNumber;this.columnNumber=columnNumber;}};Sources.SourceMapNamesResolver._scopeIdentifiers=function(scope){const startLocation=scope.startLocation();const endLocation=scope.endLocation();if(scope.type()===Protocol.Debugger.ScopeType.Global||!startLocation||!endLocation||!startLocation.script()||!startLocation.script().sourceMapURL||(startLocation.script()!==endLocation.script()))
return Promise.resolve(([]));const script=startLocation.script();return script.requestContent().then(onContent);function onContent(content){if(!content)
return Promise.resolve(([]));const text=new TextUtils.Text(content);const scopeRange=new TextUtils.TextRange(startLocation.lineNumber,startLocation.columnNumber,endLocation.lineNumber,endLocation.columnNumber);const scopeText=text.extract(scopeRange);const scopeStart=text.toSourceRange(scopeRange).offset;const prefix='function fui';return Formatter.formatterWorkerPool().javaScriptIdentifiers(prefix+scopeText).then(onIdentifiers.bind(null,text,scopeStart,prefix));}
function onIdentifiers(text,scopeStart,prefix,identifiers){const result=[];const cursor=new TextUtils.TextCursor(text.lineEndings());for(let i=0;i<identifiers.length;++i){const id=identifiers[i];if(id.offset<prefix.length)
continue;const start=scopeStart+id.offset-prefix.length;cursor.resetTo(start);result.push(new Sources.SourceMapNamesResolver.Identifier(id.name,cursor.lineNumber(),cursor.columnNumber()));}
return result;}};Sources.SourceMapNamesResolver._resolveScope=function(scope){let identifiersPromise=scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol];if(identifiersPromise)
return identifiersPromise;const script=scope.callFrame().script;const sourceMap=Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);if(!sourceMap)
return Promise.resolve(new Map());const textCache=new Map();identifiersPromise=Sources.SourceMapNamesResolver._scopeIdentifiers(scope).then(onIdentifiers);scope[Sources.SourceMapNamesResolver._cachedIdentifiersSymbol]=identifiersPromise;return identifiersPromise;function onIdentifiers(identifiers){const namesMapping=new Map();for(let i=0;i<identifiers.length;++i){const id=identifiers[i];const entry=sourceMap.findEntry(id.lineNumber,id.columnNumber);if(entry&&entry.name)
namesMapping.set(id.name,entry.name);}
const promises=[];for(let i=0;i<identifiers.length;++i){const id=identifiers[i];if(namesMapping.has(id.name))
continue;const promise=resolveSourceName(id).then(onSourceNameResolved.bind(null,namesMapping,id));promises.push(promise);}
return Promise.all(promises).then(()=>Sources.SourceMapNamesResolver._scopeResolvedForTest()).then(()=>namesMapping);}
function onSourceNameResolved(namesMapping,id,sourceName){if(!sourceName)
return;namesMapping.set(id.name,sourceName);}
function resolveSourceName(id){const startEntry=sourceMap.findEntry(id.lineNumber,id.columnNumber);const endEntry=sourceMap.findEntry(id.lineNumber,id.columnNumber+id.name.length);if(!startEntry||!endEntry||!startEntry.sourceURL||startEntry.sourceURL!==endEntry.sourceURL||!startEntry.sourceLineNumber||!startEntry.sourceColumnNumber||!endEntry.sourceLineNumber||!endEntry.sourceColumnNumber)
return Promise.resolve((null));const sourceTextRange=new TextUtils.TextRange(startEntry.sourceLineNumber,startEntry.sourceColumnNumber,endEntry.sourceLineNumber,endEntry.sourceColumnNumber);const uiSourceCode=Bindings.debuggerWorkspaceBinding.uiSourceCodeForSourceMapSourceURL(script.debuggerModel,startEntry.sourceURL,script.isContentScript());if(!uiSourceCode)
return Promise.resolve((null));return uiSourceCode.requestContent().then(onSourceContent.bind(null,sourceTextRange));}
function onSourceContent(sourceTextRange,content){if(!content)
return null;let text=textCache.get(content);if(!text){text=new TextUtils.Text(content);textCache.set(content,text);}
const originalIdentifier=text.extract(sourceTextRange).trim();return/[a-zA-Z0-9_$]+/.test(originalIdentifier)?originalIdentifier:null;}};Sources.SourceMapNamesResolver._scopeResolvedForTest=function(){};Sources.SourceMapNamesResolver._allVariablesInCallFrame=function(callFrame){const cached=callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol];if(cached)
return Promise.resolve(cached);const promises=[];const scopeChain=callFrame.scopeChain();for(let i=0;i<scopeChain.length;++i)
promises.push(Sources.SourceMapNamesResolver._resolveScope(scopeChain[i]));return Promise.all(promises).then(mergeVariables);function mergeVariables(nameMappings){const reverseMapping=new Map();for(const map of nameMappings){for(const compiledName of map.keys()){const originalName=map.get(compiledName);if(!reverseMapping.has(originalName))
reverseMapping.set(originalName,compiledName);}}
callFrame[Sources.SourceMapNamesResolver._cachedMapSymbol]=reverseMapping;return reverseMapping;}};Sources.SourceMapNamesResolver.resolveExpression=function(callFrame,originalText,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber){if(!uiSourceCode.contentType().isFromSourceMap())
return Promise.resolve('');return Sources.SourceMapNamesResolver._allVariablesInCallFrame(callFrame).then(reverseMapping=>findCompiledName(callFrame.debuggerModel,reverseMapping));function findCompiledName(debuggerModel,reverseMapping){if(reverseMapping.has(originalText))
return Promise.resolve(reverseMapping.get(originalText)||'');return Sources.SourceMapNamesResolver._resolveExpression(debuggerModel,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber);}};Sources.SourceMapNamesResolver._resolveExpression=function(debuggerModel,uiSourceCode,lineNumber,startColumnNumber,endColumnNumber){const rawLocations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode,lineNumber,startColumnNumber);const rawLocation=rawLocations.find(location=>location.debuggerModel===debuggerModel);if(!rawLocation)
return Promise.resolve('');const script=rawLocation.script();if(!script)
return Promise.resolve('');const sourceMap=Bindings.debuggerWorkspaceBinding.sourceMapForScript(script);if(!sourceMap)
return Promise.resolve('');return script.requestContent().then(onContent);function onContent(content){if(!content)
return Promise.resolve('');const text=new TextUtils.Text(content);const textRange=sourceMap.reverseMapTextRange(uiSourceCode.url(),new TextUtils.TextRange(lineNumber,startColumnNumber,lineNumber,endColumnNumber));const originalText=text.extract(textRange);if(!originalText)
return Promise.resolve('');return Formatter.formatterWorkerPool().evaluatableJavaScriptSubstring(originalText);}};Sources.SourceMapNamesResolver.resolveThisObject=function(callFrame){if(!callFrame)
return Promise.resolve((null));if(!callFrame.scopeChain().length)
return Promise.resolve(callFrame.thisObject());return Sources.SourceMapNamesResolver._resolveScope(callFrame.scopeChain()[0]).then(onScopeResolved);function onScopeResolved(namesMapping){const thisMappings=namesMapping.inverse().get('this');if(!thisMappings||thisMappings.size!==1)
return Promise.resolve(callFrame.thisObject());const thisMapping=thisMappings.valuesArray()[0];return callFrame.evaluate({expression:thisMapping,objectGroup:'backtrace',includeCommandLineAPI:false,silent:true,returnByValue:false,generatePreview:true}).then(onEvaluated);}
function onEvaluated(result){return!result.exceptionDetails&&result.object?result.object:callFrame.thisObject();}};Sources.SourceMapNamesResolver.resolveScopeInObject=function(scope){const startLocation=scope.startLocation();const endLocation=scope.endLocation();if(scope.type()===Protocol.Debugger.ScopeType.Global||!startLocation||!endLocation||!startLocation.script()||!startLocation.script().sourceMapURL||startLocation.script()!==endLocation.script())
return scope.object();return new Sources.SourceMapNamesResolver.RemoteObject(scope);};Sources.SourceMapNamesResolver.RemoteObject=class extends SDK.RemoteObject{constructor(scope){super();this._scope=scope;this._object=scope.object();}
customPreview(){return this._object.customPreview();}
get objectId(){return this._object.objectId;}
get type(){return this._object.type;}
get subtype(){return this._object.subtype;}
get value(){return this._object.value;}
get description(){return this._object.description;}
get hasChildren(){return this._object.hasChildren;}
get preview(){return this._object.preview;}
arrayLength(){return this._object.arrayLength();}
getOwnProperties(generatePreview){return this._object.getOwnProperties(generatePreview);}
async getAllProperties(accessorPropertiesOnly,generatePreview){const allProperties=await this._object.getAllProperties(accessorPropertiesOnly,generatePreview);const namesMapping=await Sources.SourceMapNamesResolver._resolveScope(this._scope);const properties=allProperties.properties;const internalProperties=allProperties.internalProperties;const newProperties=[];if(properties){for(let i=0;i<properties.length;++i){const property=properties[i];const name=namesMapping.get(property.name)||properties[i].name;newProperties.push(new SDK.RemoteObjectProperty(name,property.value,property.enumerable,property.writable,property.isOwn,property.wasThrown,property.symbol,property.synthetic));}}
return{properties:newProperties,internalProperties:internalProperties};}
async setPropertyValue(argumentName,value){const namesMapping=await Sources.SourceMapNamesResolver._resolveScope(this._scope);let name;if(typeof argumentName==='string')
name=argumentName;else
name=(argumentName.value);let actualName=name;for(const compiledName of namesMapping.keys()){if(namesMapping.get(compiledName)===name){actualName=compiledName;break;}}
return this._object.setPropertyValue(actualName,value);}
async deleteProperty(name){return this._object.deleteProperty(name);}
callFunction(functionDeclaration,args){return this._object.callFunction(functionDeclaration,args);}
callFunctionJSON(functionDeclaration,args){return this._object.callFunctionJSON(functionDeclaration,args);}
release(){this._object.release();}
debuggerModel(){return this._object.debuggerModel();}
runtimeModel(){return this._object.runtimeModel();}
isNode(){return this._object.isNode();}};;Sources.JavaScriptBreakpointsSidebarPane=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('sources/javaScriptBreakpointsSidebarPane.css');this._breakpointManager=Bindings.breakpointManager;this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this.update,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this.update,this);Common.moduleSetting('breakpointsActive').addChangeListener(this.update,this);this._listElement=null;this.update();}
doUpdate(){const breakpointLocations=this._breakpointManager.allBreakpointLocations().filter(breakpointLocation=>breakpointLocation.uiLocation.uiSourceCode.project().type()!==Workspace.projectTypes.Debugger);if(!breakpointLocations.length){this._listElement=null;this.contentElement.removeChildren();const emptyElement=this.contentElement.createChild('div','gray-info-message');emptyElement.textContent=Common.UIString('No breakpoints');this.contentElement.appendChild(emptyElement);this._didUpdateForTest();return Promise.resolve();}
if(!this._listElement){this.contentElement.removeChildren();this._listElement=this.contentElement.createChild('div');this.contentElement.appendChild(this._listElement);}
breakpointLocations.sort((item1,item2)=>item1.uiLocation.compareTo(item2.uiLocation));const breakpointEntriesForLine=new Multimap();const locationForEntry=new Multimap();for(const breakpointLocation of breakpointLocations){const uiLocation=breakpointLocation.uiLocation;const entryDescriptor=`${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}:${uiLocation.columnNumber}`;locationForEntry.set(entryDescriptor,breakpointLocation);const lineDescriptor=`${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}`;breakpointEntriesForLine.set(lineDescriptor,entryDescriptor);}
const details=UI.context.flavor(SDK.DebuggerPausedDetails);const selectedUILocation=details&&details.callFrames.length?Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(details.callFrames[0].location()):null;let shouldShowView=false;let entry=this._listElement.firstChild;const promises=[];for(const descriptor of locationForEntry.keysArray()){if(!entry){entry=this._listElement.createChild('div','breakpoint-entry');entry.addEventListener('contextmenu',this._breakpointContextMenu.bind(this),true);entry.addEventListener('click',this._revealLocation.bind(this),false);const checkboxLabel=UI.CheckboxLabel.create('');checkboxLabel.addEventListener('click',this._breakpointCheckboxClicked.bind(this),false);entry.appendChild(checkboxLabel);entry[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol]=checkboxLabel;const snippetElement=entry.createChild('div','source-text monospace');entry[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol]=snippetElement;}
const locations=Array.from(locationForEntry.get(descriptor));const uiLocation=locations[0].uiLocation;const isSelected=!!selectedUILocation&&locations.some(location=>location.uiLocation.id()===selectedUILocation.id());const hasEnabled=locations.some(location=>location.breakpoint.enabled());const hasDisabled=locations.some(location=>!location.breakpoint.enabled());const showCoumn=breakpointEntriesForLine.get(`${uiLocation.uiSourceCode.url()}:${uiLocation.lineNumber}`).size>1;promises.push(this._resetEntry((entry),uiLocation,isSelected,hasEnabled,hasDisabled,showCoumn));entry[Sources.JavaScriptBreakpointsSidebarPane._breakpointLocationsSymbol]=locations;if(isSelected)
shouldShowView=true;entry=entry.nextSibling;}
while(entry){const next=entry.nextSibling;entry.remove();entry=next;}
if(shouldShowView)
UI.viewManager.showView('sources.jsBreakpoints');this._listElement.classList.toggle('breakpoints-list-deactivated',!Common.moduleSetting('breakpointsActive').get());return Promise.all(promises).then(()=>this._didUpdateForTest());}
async _resetEntry(element,uiLocation,isSelected,hasEnabled,hasDisabled,showColumn){element[Sources.JavaScriptBreakpointsSidebarPane._locationSymbol]=uiLocation;element.classList.toggle('breakpoint-hit',isSelected);const checkboxLabel=element[Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol];checkboxLabel.textElement.textContent=uiLocation.linkText()+(showColumn?':'+(uiLocation.columnNumber+1):'');checkboxLabel.checkboxElement.checked=hasEnabled;checkboxLabel.checkboxElement.indeterminate=hasEnabled&&hasDisabled;const snippetElement=element[Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol];const content=await uiLocation.uiSourceCode.requestContent();const lineNumber=uiLocation.lineNumber;const text=new TextUtils.Text(content||'');if(lineNumber<text.lineCount()){const lineText=text.lineAt(lineNumber);const maxSnippetLength=200;snippetElement.textContent=lineText.substring(showColumn?uiLocation.columnNumber:0).trimEnd(maxSnippetLength);}}
_breakpointLocations(event){const node=event.target.enclosingNodeOrSelfWithClass('breakpoint-entry');if(!node)
return[];return node[Sources.JavaScriptBreakpointsSidebarPane._breakpointLocationsSymbol]||[];}
_breakpointCheckboxClicked(event){const breakpoints=this._breakpointLocations(event).map(breakpointLocation=>breakpointLocation.breakpoint);const newState=event.target.checkboxElement.checked;for(const breakpoint of breakpoints)
breakpoint.setEnabled(newState);event.consume();}
_revealLocation(event){const uiLocations=this._breakpointLocations(event).map(breakpointLocation=>breakpointLocation.uiLocation);let uiLocation=null;for(const uiLocationCandidate of uiLocations){if(!uiLocation||uiLocationCandidate.columnNumber<uiLocation.columnNumber)
uiLocation=uiLocationCandidate;}
if(uiLocation)
Common.Revealer.reveal(uiLocation);}
_breakpointContextMenu(event){const breakpoints=this._breakpointLocations(event).map(breakpointLocation=>breakpointLocation.breakpoint);const contextMenu=new UI.ContextMenu(event);const removeEntryTitle=breakpoints.length>1?Common.UIString('Remove all breakpoints in line'):Common.UIString('Remove breakpoint');contextMenu.defaultSection().appendItem(removeEntryTitle,()=>breakpoints.map(breakpoint=>breakpoint.remove(false)));const breakpointActive=Common.moduleSetting('breakpointsActive').get();const breakpointActiveTitle=breakpointActive?Common.UIString('Deactivate breakpoints'):Common.UIString('Activate breakpoints');contextMenu.defaultSection().appendItem(breakpointActiveTitle,()=>Common.moduleSetting('breakpointsActive').set(!breakpointActive));if(breakpoints.some(breakpoint=>!breakpoint.enabled())){const enableTitle=Common.UIString('Enable all breakpoints');contextMenu.defaultSection().appendItem(enableTitle,this._toggleAllBreakpoints.bind(this,true));}
if(breakpoints.some(breakpoint=>breakpoint.enabled())){const disableTitle=Common.UIString('Disable all breakpoints');contextMenu.defaultSection().appendItem(disableTitle,this._toggleAllBreakpoints.bind(this,false));}
const removeAllTitle=Common.UIString('Remove all breakpoints');contextMenu.defaultSection().appendItem(removeAllTitle,this._removeAllBreakpoints.bind(this));const removeOtherTitle=Common.UIString('Remove other breakpoints');contextMenu.defaultSection().appendItem(removeOtherTitle,this._removeOtherBreakpoints.bind(this,new Set(breakpoints)));contextMenu.show();}
_toggleAllBreakpoints(toggleState){for(const breakpointLocation of this._breakpointManager.allBreakpointLocations())
breakpointLocation.breakpoint.setEnabled(toggleState);}
_removeAllBreakpoints(){for(const breakpointLocation of this._breakpointManager.allBreakpointLocations())
breakpointLocation.breakpoint.remove(false);}
_removeOtherBreakpoints(selectedBreakpoints){for(const breakpointLocation of this._breakpointManager.allBreakpointLocations()){if(!selectedBreakpoints.has(breakpointLocation.breakpoint))
breakpointLocation.breakpoint.remove(false);}}
flavorChanged(object){this.update();}
_didUpdateForTest(){}};Sources.JavaScriptBreakpointsSidebarPane._locationSymbol=Symbol('location');Sources.JavaScriptBreakpointsSidebarPane._checkboxLabelSymbol=Symbol('checkbox-label');Sources.JavaScriptBreakpointsSidebarPane._snippetElementSymbol=Symbol('snippet-element');Sources.JavaScriptBreakpointsSidebarPane._breakpointLocationsSymbol=Symbol('locations');;Sources.UISourceCodeFrame=class extends SourceFrame.SourceFrame{constructor(uiSourceCode){super(workingCopy);this._uiSourceCode=uiSourceCode;if(Runtime.experiments.isEnabled('sourceDiff'))
this._diff=new SourceFrame.SourceCodeDiff(this.textEditor);this._muteSourceCodeEvents=false;this._isSettingContent=false;this._persistenceBinding=Persistence.persistence.binding(uiSourceCode);this._rowMessageBuckets=new Map();this._typeDecorationsPending=new Set();this._uiSourceCodeEventListeners=[];this._messageAndDecorationListeners=[];this._boundOnBindingChanged=this._onBindingChanged.bind(this);this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.EditorBlurred,()=>UI.context.setFlavor(Sources.UISourceCodeFrame,null));this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.EditorFocused,()=>UI.context.setFlavor(Sources.UISourceCodeFrame,this));Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').addChangeListener(this._onNetworkPersistenceChanged,this);this._errorPopoverHelper=new UI.PopoverHelper(this.element,this._getErrorPopoverContent.bind(this));this._errorPopoverHelper.setHasPadding(true);this._errorPopoverHelper.setTimeout(100,100);this._plugins=[];this._initializeUISourceCode();function workingCopy(){if(uiSourceCode.isDirty())
return(Promise.resolve(uiSourceCode.workingCopy()));return uiSourceCode.requestContent();}}
_installMessageAndDecorationListeners(){if(this._persistenceBinding){const networkSourceCode=this._persistenceBinding.network;const fileSystemSourceCode=this._persistenceBinding.fileSystem;this._messageAndDecorationListeners=[networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded,this._onMessageAdded,this),networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved,this._onMessageRemoved,this),networkSourceCode.addEventListener(Workspace.UISourceCode.Events.LineDecorationAdded,this._onLineDecorationAdded,this),networkSourceCode.addEventListener(Workspace.UISourceCode.Events.LineDecorationRemoved,this._onLineDecorationRemoved,this),fileSystemSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded,this._onMessageAdded,this),fileSystemSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved,this._onMessageRemoved,this),];}else{this._messageAndDecorationListeners=[this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded,this._onMessageAdded,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved,this._onMessageRemoved,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.LineDecorationAdded,this._onLineDecorationAdded,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.LineDecorationRemoved,this._onLineDecorationRemoved,this)];}}
uiSourceCode(){return this._uiSourceCode;}
setUISourceCode(uiSourceCode){this._unloadUISourceCode();this._uiSourceCode=uiSourceCode;if(uiSourceCode.contentLoaded()){if(uiSourceCode.workingCopy()!==this.textEditor.text())
this._innerSetContent(uiSourceCode.workingCopy());}else{uiSourceCode.requestContent().then(()=>{if(this._uiSourceCode!==uiSourceCode)
return;if(uiSourceCode.workingCopy()!==this.textEditor.text())
this._innerSetContent(uiSourceCode.workingCopy());});}
this._initializeUISourceCode();}
_unloadUISourceCode(){this._disposePlugins();for(const message of this._allMessages())
this._removeMessageFromSource(message);Common.EventTarget.removeEventListeners(this._messageAndDecorationListeners);Common.EventTarget.removeEventListeners(this._uiSourceCodeEventListeners);this._uiSourceCode.removeWorkingCopyGetter();Persistence.persistence.unsubscribeFromBindingEvent(this._uiSourceCode,this._boundOnBindingChanged);}
_initializeUISourceCode(){this._uiSourceCodeEventListeners=[this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._onWorkingCopyChanged,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._onWorkingCopyCommitted,this),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,this._refreshHighlighterType,this)];Persistence.persistence.subscribeForBindingEvent(this._uiSourceCode,this._boundOnBindingChanged);for(const message of this._allMessages())
this._addMessageToSource(message);this._installMessageAndDecorationListeners();this._updateStyle();this._decorateAllTypes();this._refreshHighlighterType();if(Runtime.experiments.isEnabled('sourcesPrettyPrint')){const supportedPrettyTypes=new Set(['text/html','text/css','text/javascript']);this.setCanPrettyPrint(supportedPrettyTypes.has(this.highlighterType()),true);}
this._ensurePluginsLoaded();}
wasShown(){super.wasShown();setImmediate(this._updateBucketDecorations.bind(this));this.setEditable(this._canEditSource());for(const plugin of this._plugins)
plugin.wasShown();}
willHide(){for(const plugin of this._plugins)
plugin.willHide();super.willHide();UI.context.setFlavor(Sources.UISourceCodeFrame,null);this._uiSourceCode.removeWorkingCopyGetter();}
_refreshHighlighterType(){const binding=Persistence.persistence.binding(this._uiSourceCode);const highlighterType=binding?binding.network.mimeType():this._uiSourceCode.mimeType();if(this.highlighterType()===highlighterType)
return;this._disposePlugins();this.setHighlighterType(highlighterType);this._ensurePluginsLoaded();}
_canEditSource(){if(Persistence.persistence.binding(this._uiSourceCode))
return true;if(this._uiSourceCode.project().canSetFileContent())
return true;if(this._uiSourceCode.project().isServiceProject())
return false;if(this._uiSourceCode.project().type()===Workspace.projectTypes.Network&&Persistence.networkPersistenceManager.active())
return true;if(this.pretty&&this._uiSourceCode.contentType().hasScripts())
return false;return this._uiSourceCode.contentType()!==Common.resourceTypes.Document;}
_onNetworkPersistenceChanged(){this.setEditable(this._canEditSource());}
commitEditing(){if(!this._uiSourceCode.isDirty())
return;this._muteSourceCodeEvents=true;this._uiSourceCode.commitWorkingCopy();this._muteSourceCodeEvents=false;}
setContent(content){this._disposePlugins();this._rowMessageBuckets.clear();super.setContent(content);for(const message of this._allMessages())
this._addMessageToSource(message);this._decorateAllTypes();this._ensurePluginsLoaded();}
_allMessages(){if(this._persistenceBinding){const combinedSet=this._persistenceBinding.network.messages();combinedSet.addAll(this._persistenceBinding.fileSystem.messages());return combinedSet;}
return this._uiSourceCode.messages();}
onTextChanged(oldRange,newRange){const wasPretty=this.pretty;super.onTextChanged(oldRange,newRange);this._errorPopoverHelper.hidePopover();if(this._isSettingContent)
return;Sources.SourcesPanel.instance().updateLastModificationTime();this._muteSourceCodeEvents=true;if(this.isClean())
this._uiSourceCode.resetWorkingCopy();else
this._uiSourceCode.setWorkingCopyGetter(this.textEditor.text.bind(this.textEditor));this._muteSourceCodeEvents=false;if(wasPretty!==this.pretty){this._updateStyle();this._disposePlugins();this._ensurePluginsLoaded();}}
_onWorkingCopyChanged(event){if(this._muteSourceCodeEvents)
return;this._innerSetContent(this._uiSourceCode.workingCopy());}
_onWorkingCopyCommitted(event){if(!this._muteSourceCodeEvents)
this._innerSetContent(this._uiSourceCode.workingCopy());this.contentCommitted();this._updateStyle();}
_ensurePluginsLoaded(){if(!this.loaded||this._plugins.length)
return;const binding=Persistence.persistence.binding(this._uiSourceCode);const pluginUISourceCode=binding?binding.network:this._uiSourceCode;if(Sources.DebuggerPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.DebuggerPlugin(this.textEditor,pluginUISourceCode,this.transformer()));if(Sources.CSSPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.CSSPlugin(this.textEditor));if(!this.pretty&&Sources.JavaScriptCompilerPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.JavaScriptCompilerPlugin(this.textEditor,pluginUISourceCode));if(Sources.SnippetsPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.SnippetsPlugin(this.textEditor,pluginUISourceCode));if(Sources.ScriptOriginPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.ScriptOriginPlugin(this.textEditor,pluginUISourceCode));if(!this.pretty&&Runtime.experiments.isEnabled('sourceDiff')&&Sources.GutterDiffPlugin.accepts(pluginUISourceCode))
this._plugins.push(new Sources.GutterDiffPlugin(this.textEditor,pluginUISourceCode));this.dispatchEventToListeners(Sources.UISourceCodeFrame.Events.ToolbarItemsChanged);for(const plugin of this._plugins)
plugin.wasShown();}
_disposePlugins(){this.textEditor.operation(()=>{for(const plugin of this._plugins)
plugin.dispose();});this._plugins=[];}
_onBindingChanged(){const binding=Persistence.persistence.binding(this._uiSourceCode);if(binding===this._persistenceBinding)
return;this._unloadUISourceCode();this._persistenceBinding=binding;this._initializeUISourceCode();}
_updateStyle(){this.setEditable(this._canEditSource());}
_innerSetContent(content){this._isSettingContent=true;const oldContent=this.textEditor.text();if(this._diff)
this._diff.highlightModifiedLines(oldContent,content);if(oldContent!==content)
this.setContent(content);this._isSettingContent=false;}
async populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber){await super.populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber);contextMenu.appendApplicableItems(this._uiSourceCode);const location=this.transformer().editorToRawLocation(editorLineNumber,editorColumnNumber);contextMenu.appendApplicableItems(new Workspace.UILocation(this._uiSourceCode,location[0],location[1]));contextMenu.appendApplicableItems(this);for(const plugin of this._plugins)
await plugin.populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber);}
dispose(){this._errorPopoverHelper.dispose();this._unloadUISourceCode();this.textEditor.dispose();this.detach();Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').removeChangeListener(this._onNetworkPersistenceChanged,this);}
_onMessageAdded(event){const message=(event.data);this._addMessageToSource(message);}
_addMessageToSource(message){if(!this.loaded)
return;const editorLocation=this.transformer().rawToEditorLocation(message.lineNumber(),message.columnNumber());let editorLineNumber=editorLocation[0];if(editorLineNumber>=this.textEditor.linesCount)
editorLineNumber=this.textEditor.linesCount-1;if(editorLineNumber<0)
editorLineNumber=0;let messageBucket=this._rowMessageBuckets.get(editorLineNumber);if(!messageBucket){messageBucket=new Sources.UISourceCodeFrame.RowMessageBucket(this,this.textEditor,editorLineNumber);this._rowMessageBuckets.set(editorLineNumber,messageBucket);}
messageBucket.addMessage(message);}
_onMessageRemoved(event){const message=(event.data);this._removeMessageFromSource(message);}
_removeMessageFromSource(message){if(!this.loaded)
return;const editorLocation=this.transformer().rawToEditorLocation(message.lineNumber(),message.columnNumber());let editorLineNumber=editorLocation[0];if(editorLineNumber>=this.textEditor.linesCount)
editorLineNumber=this.textEditor.linesCount-1;if(editorLineNumber<0)
editorLineNumber=0;const messageBucket=this._rowMessageBuckets.get(editorLineNumber);if(!messageBucket)
return;messageBucket.removeMessage(message);if(!messageBucket.uniqueMessagesCount()){messageBucket.detachFromEditor();this._rowMessageBuckets.delete(editorLineNumber);}}
_getErrorPopoverContent(event){const element=event.target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon')||event.target.enclosingNodeOrSelfWithClass('text-editor-line-decoration-wave');if(!element)
return null;const anchor=element.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon')?element.boxInWindow():new AnchorBox(event.clientX,event.clientY,1,1);return{box:anchor,show:popover=>{const messageBucket=element.enclosingNodeOrSelfWithClass('text-editor-line-decoration')._messageBucket;const messagesOutline=messageBucket.messagesDescription();popover.contentElement.appendChild(messagesOutline);return Promise.resolve(true);}};}
_updateBucketDecorations(){for(const bucket of this._rowMessageBuckets.values())
bucket._updateDecoration();}
_onLineDecorationAdded(event){const marker=(event.data);this._decorateTypeThrottled(marker.type());}
_onLineDecorationRemoved(event){const marker=(event.data);this._decorateTypeThrottled(marker.type());}
async _decorateTypeThrottled(type){if(this._typeDecorationsPending.has(type))
return;this._typeDecorationsPending.add(type);const decorator=await self.runtime.extensions(SourceFrame.LineDecorator).find(extension=>extension.descriptor()['decoratorType']===type).instance();this._typeDecorationsPending.delete(type);this.textEditor.codeMirror().operation(()=>{decorator.decorate(this._persistenceBinding?this._persistenceBinding.network:this.uiSourceCode(),this.textEditor,type);});}
_decorateAllTypes(){if(!this.loaded)
return;for(const extension of self.runtime.extensions(SourceFrame.LineDecorator)){const type=extension.descriptor()['decoratorType'];if(this._uiSourceCode.decorationsForType(type))
this._decorateTypeThrottled(type);}}
syncToolbarItems(){const leftToolbarItems=super.syncToolbarItems();const rightToolbarItems=[];for(const plugin of this._plugins){leftToolbarItems.pushAll(plugin.leftToolbarItems());rightToolbarItems.pushAll(plugin.rightToolbarItems());}
if(!rightToolbarItems.length)
return leftToolbarItems;return[...leftToolbarItems,new UI.ToolbarSeparator(true),...rightToolbarItems];}
async populateLineGutterContextMenu(contextMenu,lineNumber){await super.populateLineGutterContextMenu(contextMenu,lineNumber);for(const plugin of this._plugins)
await plugin.populateLineGutterContextMenu(contextMenu,lineNumber);}};Sources.UISourceCodeFrame._iconClassPerLevel={};Sources.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Error]='smallicon-error';Sources.UISourceCodeFrame._iconClassPerLevel[Workspace.UISourceCode.Message.Level.Warning]='smallicon-warning';Sources.UISourceCodeFrame._bubbleTypePerLevel={};Sources.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Error]='error';Sources.UISourceCodeFrame._bubbleTypePerLevel[Workspace.UISourceCode.Message.Level.Warning]='warning';Sources.UISourceCodeFrame._lineClassPerLevel={};Sources.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Error]='text-editor-line-with-error';Sources.UISourceCodeFrame._lineClassPerLevel[Workspace.UISourceCode.Message.Level.Warning]='text-editor-line-with-warning';Sources.UISourceCodeFrame.RowMessage=class{constructor(message){this._message=message;this._repeatCount=1;this.element=createElementWithClass('div','text-editor-row-message');this._icon=this.element.createChild('label','','dt-icon-label');this._icon.type=Sources.UISourceCodeFrame._iconClassPerLevel[message.level()];this._repeatCountElement=this.element.createChild('span','text-editor-row-message-repeat-count hidden','dt-small-bubble');this._repeatCountElement.type=Sources.UISourceCodeFrame._bubbleTypePerLevel[message.level()];const linesContainer=this.element.createChild('div');const lines=this._message.text().split('\n');for(let i=0;i<lines.length;++i){const messageLine=linesContainer.createChild('div');messageLine.textContent=lines[i];}}
message(){return this._message;}
repeatCount(){return this._repeatCount;}
setRepeatCount(repeatCount){if(this._repeatCount===repeatCount)
return;this._repeatCount=repeatCount;this._updateMessageRepeatCount();}
_updateMessageRepeatCount(){this._repeatCountElement.textContent=this._repeatCount;const showRepeatCount=this._repeatCount>1;this._repeatCountElement.classList.toggle('hidden',!showRepeatCount);this._icon.classList.toggle('hidden',showRepeatCount);}};Sources.UISourceCodeFrame.RowMessageBucket=class{constructor(sourceFrame,textEditor,editorLineNumber){this._sourceFrame=sourceFrame;this.textEditor=textEditor;this._lineHandle=textEditor.textEditorPositionHandle(editorLineNumber,0);this._decoration=createElementWithClass('div','text-editor-line-decoration');this._decoration._messageBucket=this;this._wave=this._decoration.createChild('div','text-editor-line-decoration-wave');this._icon=this._wave.createChild('span','text-editor-line-decoration-icon','dt-icon-label');this._decorationStartColumn=null;this._messagesDescriptionElement=createElementWithClass('div','text-editor-messages-description-container');this._messages=[];this._level=null;}
_updateWavePosition(editorLineNumber,columnNumber){editorLineNumber=Math.min(editorLineNumber,this.textEditor.linesCount-1);const lineText=this.textEditor.line(editorLineNumber);columnNumber=Math.min(columnNumber,lineText.length);const lineIndent=TextUtils.TextUtils.lineIndent(lineText).length;const startColumn=Math.max(columnNumber-1,lineIndent);if(this._decorationStartColumn===startColumn)
return;if(this._decorationStartColumn!==null)
this.textEditor.removeDecoration(this._decoration,editorLineNumber);this.textEditor.addDecoration(this._decoration,editorLineNumber,startColumn);this._decorationStartColumn=startColumn;}
messagesDescription(){this._messagesDescriptionElement.removeChildren();UI.appendStyle(this._messagesDescriptionElement,'source_frame/messagesPopover.css');for(let i=0;i<this._messages.length;++i)
this._messagesDescriptionElement.appendChild(this._messages[i].element);return this._messagesDescriptionElement;}
detachFromEditor(){const position=this._lineHandle.resolve();if(!position)
return;const editorLineNumber=position.lineNumber;if(this._level){this.textEditor.toggleLineClass(editorLineNumber,Sources.UISourceCodeFrame._lineClassPerLevel[this._level],false);}
if(this._decorationStartColumn!==null){this.textEditor.removeDecoration(this._decoration,editorLineNumber);this._decorationStartColumn=null;}}
uniqueMessagesCount(){return this._messages.length;}
addMessage(message){for(let i=0;i<this._messages.length;++i){const rowMessage=this._messages[i];if(rowMessage.message().isEqual(message)){rowMessage.setRepeatCount(rowMessage.repeatCount()+1);return;}}
const rowMessage=new Sources.UISourceCodeFrame.RowMessage(message);this._messages.push(rowMessage);this._updateDecoration();}
removeMessage(message){for(let i=0;i<this._messages.length;++i){const rowMessage=this._messages[i];if(!rowMessage.message().isEqual(message))
continue;rowMessage.setRepeatCount(rowMessage.repeatCount()-1);if(!rowMessage.repeatCount())
this._messages.splice(i,1);this._updateDecoration();return;}}
_updateDecoration(){if(!this._sourceFrame.isShowing())
return;if(!this._messages.length)
return;const position=this._lineHandle.resolve();if(!position)
return;const editorLineNumber=position.lineNumber;let columnNumber=Number.MAX_VALUE;let maxMessage=null;for(let i=0;i<this._messages.length;++i){const message=this._messages[i].message();const editorLocation=this._sourceFrame.transformer().rawToEditorLocation(editorLineNumber,message.columnNumber());columnNumber=Math.min(columnNumber,editorLocation[1]);if(!maxMessage||Workspace.UISourceCode.Message.messageLevelComparator(maxMessage,message)<0)
maxMessage=message;}
this._updateWavePosition(editorLineNumber,columnNumber);if(this._level===maxMessage.level())
return;if(this._level){this.textEditor.toggleLineClass(editorLineNumber,Sources.UISourceCodeFrame._lineClassPerLevel[this._level],false);this._icon.type='';}
this._level=maxMessage.level();if(!this._level)
return;this.textEditor.toggleLineClass(editorLineNumber,Sources.UISourceCodeFrame._lineClassPerLevel[this._level],true);this._icon.type=Sources.UISourceCodeFrame._iconClassPerLevel[this._level];}};Workspace.UISourceCode.Message._messageLevelPriority={'Warning':3,'Error':4};Workspace.UISourceCode.Message.messageLevelComparator=function(a,b){return Workspace.UISourceCode.Message._messageLevelPriority[a.level()]-
Workspace.UISourceCode.Message._messageLevelPriority[b.level()];};Sources.UISourceCodeFrame.Plugin=class{static accepts(uiSourceCode){return false;}
wasShown(){}
willHide(){}
rightToolbarItems(){return[];}
leftToolbarItems(){return[];}
populateLineGutterContextMenu(contextMenu,lineNumber){return Promise.resolve();}
populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber){return Promise.resolve();}
dispose(){}};Sources.UISourceCodeFrame.Events={ToolbarItemsChanged:Symbol('ToolbarItemsChanged')};;Sources.DebuggerPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor,uiSourceCode,transformer){super();this._textEditor=textEditor;this._uiSourceCode=uiSourceCode;this._transformer=transformer;this._executionLocation=null;this._controlDown=false;this._asyncStepInHoveredLine=0;this._asyncStepInHovered=false;this._clearValueWidgetsTimer=null;this._sourceMapInfobar=null;this._controlTimeout=null;this._scriptsPanel=Sources.SourcesPanel.instance();this._breakpointManager=Bindings.breakpointManager;if(uiSourceCode.project().type()===Workspace.projectTypes.Debugger)
this._textEditor.element.classList.add('source-frame-debugger-script');this._popoverHelper=new UI.PopoverHelper(this._scriptsPanel.element,this._getPopoverRequest.bind(this));this._popoverHelper.setDisableOnClick(true);this._popoverHelper.setTimeout(250,250);this._popoverHelper.setHasPadding(true);this._boundPopoverHelperHide=this._popoverHelper.hidePopover.bind(this._popoverHelper);this._scriptsPanel.element.addEventListener('scroll',this._boundPopoverHelperHide,true);this._boundKeyDown=(this._onKeyDown.bind(this));this._textEditor.element.addEventListener('keydown',this._boundKeyDown,true);this._boundKeyUp=(this._onKeyUp.bind(this));this._textEditor.element.addEventListener('keyup',this._boundKeyUp,true);this._boundMouseMove=(this._onMouseMove.bind(this));this._textEditor.element.addEventListener('mousemove',this._boundMouseMove,false);this._boundMouseDown=(this._onMouseDown.bind(this));this._textEditor.element.addEventListener('mousedown',this._boundMouseDown,true);this._boundBlur=this._onBlur.bind(this);this._textEditor.element.addEventListener('focusout',this._boundBlur,false);this._boundWheel=event=>{if(this._executionLocation&&UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
event.preventDefault();};this._textEditor.element.addEventListener('wheel',this._boundWheel,true);this._textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick,this._handleGutterClick,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.addEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);this._breakpointDecorations=new Set();this._decorationByBreakpoint=new Map();this._possibleBreakpointsRequested=new Set();this._scriptFileForDebuggerModel=new Map();Common.moduleSetting('skipStackFramesPattern').addChangeListener(this._showBlackboxInfobarIfNeeded,this);Common.moduleSetting('skipContentScripts').addChangeListener(this._showBlackboxInfobarIfNeeded,this);this._valueWidgets=new Map();this._continueToLocationDecorations=null;UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this._callFrameChanged,this);this._liveLocationPool=new Bindings.LiveLocationPool();this._callFrameChanged();this._updateScriptFiles();if(this._uiSourceCode.isDirty()){this._muted=true;this._mutedFromStart=true;}else{this._muted=false;this._mutedFromStart=false;this._initializeBreakpoints();}
this._blackboxInfobar=null;this._showBlackboxInfobarIfNeeded();const scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(let i=0;i<scriptFiles.length;++i)
scriptFiles[i].checkMapping();this._hasLineWithoutMapping=false;this._updateLinesWithoutMappingHighlight();if(!Runtime.experiments.isEnabled('sourcesPrettyPrint')){this._prettyPrintInfobar=null;this._detectMinified();}}
static accepts(uiSourceCode){return uiSourceCode.contentType().hasScripts();}
_showBlackboxInfobarIfNeeded(){const uiSourceCode=this._uiSourceCode;if(!uiSourceCode.contentType().hasScripts())
return;const projectType=uiSourceCode.project().type();if(!Bindings.blackboxManager.isBlackboxedUISourceCode(uiSourceCode)){this._hideBlackboxInfobar();return;}
if(this._blackboxInfobar)
this._blackboxInfobar.dispose();const infobar=new UI.Infobar(UI.Infobar.Type.Warning,Common.UIString('This script is blackboxed in debugger'));this._blackboxInfobar=infobar;infobar.createDetailsRowMessage(Common.UIString('Debugger will skip stepping through this script, and will not stop on exceptions'));const scriptFile=this._scriptFileForDebuggerModel.size?this._scriptFileForDebuggerModel.valuesArray()[0]:null;if(scriptFile&&scriptFile.hasSourceMapURL())
infobar.createDetailsRowMessage(Common.UIString('Source map found, but ignored for blackboxed file.'));infobar.createDetailsRowMessage();infobar.createDetailsRowMessage(Common.UIString('Possible ways to cancel this behavior are:'));infobar.createDetailsRowMessage(' - ').createTextChild(Common.UIString('Go to "%s" tab in settings',Common.UIString('Blackboxing')));const unblackboxLink=infobar.createDetailsRowMessage(' - ').createChild('span','link');unblackboxLink.textContent=Common.UIString('Unblackbox this script');unblackboxLink.addEventListener('click',unblackbox,false);function unblackbox(){Bindings.blackboxManager.unblackboxUISourceCode(uiSourceCode);if(projectType===Workspace.projectTypes.ContentScripts)
Bindings.blackboxManager.unblackboxContentScripts();}
this._textEditor.attachInfobar(this._blackboxInfobar);}
_hideBlackboxInfobar(){if(!this._blackboxInfobar)
return;this._blackboxInfobar.dispose();this._blackboxInfobar=null;}
wasShown(){if(this._executionLocation){setImmediate(()=>{this._generateValuesInSource();});}}
willHide(){this._popoverHelper.hidePopover();}
populateLineGutterContextMenu(contextMenu,editorLineNumber){function populate(resolve,reject){const uiLocation=new Workspace.UILocation(this._uiSourceCode,editorLineNumber,0);this._scriptsPanel.appendUILocationItems(contextMenu,uiLocation);const breakpoints=this._lineBreakpointDecorations(editorLineNumber).map(decoration=>decoration.breakpoint).filter(breakpoint=>!!breakpoint);if(!breakpoints.length){contextMenu.debugSection().appendItem(Common.UIString('Add breakpoint'),this._createNewBreakpoint.bind(this,editorLineNumber,'',true));contextMenu.debugSection().appendItem(Common.UIString('Add conditional breakpoint\u2026'),this._editBreakpointCondition.bind(this,editorLineNumber,null,null));contextMenu.debugSection().appendItem(ls`Add logpoint\u2026`,this._editBreakpointCondition.bind(this,editorLineNumber,null,null,true));contextMenu.debugSection().appendItem(Common.UIString('Never pause here'),this._createNewBreakpoint.bind(this,editorLineNumber,'false',true));}else{const hasOneBreakpoint=breakpoints.length===1;const removeTitle=hasOneBreakpoint?Common.UIString('Remove breakpoint'):Common.UIString('Remove all breakpoints in line');contextMenu.debugSection().appendItem(removeTitle,()=>breakpoints.map(breakpoint=>breakpoint.remove()));if(hasOneBreakpoint){contextMenu.debugSection().appendItem(Common.UIString('Edit breakpoint\u2026'),this._editBreakpointCondition.bind(this,editorLineNumber,breakpoints[0],null));}
const hasEnabled=breakpoints.some(breakpoint=>breakpoint.enabled());if(hasEnabled){const title=hasOneBreakpoint?Common.UIString('Disable breakpoint'):Common.UIString('Disable all breakpoints in line');contextMenu.debugSection().appendItem(title,()=>breakpoints.map(breakpoint=>breakpoint.setEnabled(false)));}
const hasDisabled=breakpoints.some(breakpoint=>!breakpoint.enabled());if(hasDisabled){const title=hasOneBreakpoint?Common.UIString('Enable breakpoint'):Common.UIString('Enabled all breakpoints in line');contextMenu.debugSection().appendItem(title,()=>breakpoints.map(breakpoint=>breakpoint.setEnabled(true)));}}
resolve();}
return new Promise(populate.bind(this));}
populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber){function addSourceMapURL(scriptFile){Sources.AddSourceMapURLDialog.show(addSourceMapURLDialogCallback.bind(null,scriptFile));}
function addSourceMapURLDialogCallback(scriptFile,url){if(!url)
return;scriptFile.addSourceMapURL(url);}
function populateSourceMapMembers(){if(this._uiSourceCode.project().type()===Workspace.projectTypes.Network&&Common.moduleSetting('jsSourceMapsEnabled').get()&&!Bindings.blackboxManager.isBlackboxedUISourceCode(this._uiSourceCode)){if(this._scriptFileForDebuggerModel.size){const scriptFile=this._scriptFileForDebuggerModel.valuesArray()[0];const addSourceMapURLLabel=Common.UIString('Add source map\u2026');contextMenu.debugSection().appendItem(addSourceMapURLLabel,addSourceMapURL.bind(null,scriptFile));}}}
return super.populateTextAreaContextMenu(contextMenu,editorLineNumber,editorColumnNumber).then(populateSourceMapMembers.bind(this));}
_workingCopyChanged(){if(this._scriptFileForDebuggerModel.size)
return;if(this._uiSourceCode.isDirty())
this._muteBreakpointsWhileEditing();else
this._restoreBreakpointsAfterEditing();}
_workingCopyCommitted(event){this._scriptsPanel.updateLastModificationTime();if(!this._scriptFileForDebuggerModel.size)
this._restoreBreakpointsAfterEditing();}
_didMergeToVM(){this._restoreBreakpointsIfConsistentScripts();}
_didDivergeFromVM(){this._muteBreakpointsWhileEditing();}
_muteBreakpointsWhileEditing(){if(this._muted)
return;for(const decoration of this._breakpointDecorations)
this._updateBreakpointDecoration(decoration);this._muted=true;}
_restoreBreakpointsIfConsistentScripts(){const scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(let i=0;i<scriptFiles.length;++i){if(scriptFiles[i].hasDivergedFromVM()||scriptFiles[i].isMergingToVM())
return;}
this._restoreBreakpointsAfterEditing();}
_restoreBreakpointsAfterEditing(){this._muted=false;if(this._mutedFromStart){this._mutedFromStart=false;this._initializeBreakpoints();return;}
const decorations=Array.from(this._breakpointDecorations);this._breakpointDecorations.clear();this._textEditor.operation(()=>decorations.map(decoration=>decoration.hide()));for(const decoration of decorations){if(!decoration.breakpoint)
continue;const enabled=decoration.enabled;decoration.breakpoint.remove();const location=decoration.handle.resolve();if(location)
this._setBreakpoint(location.lineNumber,location.columnNumber,decoration.condition,enabled);}}
_isIdentifier(tokenType){return tokenType.startsWith('js-variable')||tokenType.startsWith('js-property')||tokenType==='js-def';}
_getPopoverRequest(event){if(UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
return null;const target=UI.context.flavor(SDK.Target);const debuggerModel=target?target.model(SDK.DebuggerModel):null;if(!debuggerModel||!debuggerModel.isPaused())
return null;const textPosition=this._textEditor.coordinatesToCursorPosition(event.x,event.y);if(!textPosition)
return null;const mouseLine=textPosition.startLine;const mouseColumn=textPosition.startColumn;const textSelection=this._textEditor.selection().normalize();let anchorBox;let editorLineNumber;let startHighlight;let endHighlight;if(textSelection&&!textSelection.isEmpty()){if(textSelection.startLine!==textSelection.endLine||textSelection.startLine!==mouseLine||mouseColumn<textSelection.startColumn||mouseColumn>textSelection.endColumn)
return null;const leftCorner=this._textEditor.cursorPositionToCoordinates(textSelection.startLine,textSelection.startColumn);const rightCorner=this._textEditor.cursorPositionToCoordinates(textSelection.endLine,textSelection.endColumn);anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);editorLineNumber=textSelection.startLine;startHighlight=textSelection.startColumn;endHighlight=textSelection.endColumn-1;}else{const token=this._textEditor.tokenAtTextPosition(textPosition.startLine,textPosition.startColumn);if(!token||!token.type)
return null;editorLineNumber=textPosition.startLine;const line=this._textEditor.line(editorLineNumber);const tokenContent=line.substring(token.startColumn,token.endColumn);const isIdentifier=this._isIdentifier(token.type);if(!isIdentifier&&(token.type!=='js-keyword'||tokenContent!=='this'))
return null;const leftCorner=this._textEditor.cursorPositionToCoordinates(editorLineNumber,token.startColumn);const rightCorner=this._textEditor.cursorPositionToCoordinates(editorLineNumber,token.endColumn-1);anchorBox=new AnchorBox(leftCorner.x,leftCorner.y,rightCorner.x-leftCorner.x,leftCorner.height);startHighlight=token.startColumn;endHighlight=token.endColumn-1;while(startHighlight>1&&line.charAt(startHighlight-1)==='.'){const tokenBefore=this._textEditor.tokenAtTextPosition(editorLineNumber,startHighlight-2);if(!tokenBefore||!tokenBefore.type)
return null;if(tokenBefore.type==='js-meta')
break;startHighlight=tokenBefore.startColumn;}}
let objectPopoverHelper;let highlightDescriptor;return{box:anchorBox,show:async popover=>{const selectedCallFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!selectedCallFrame)
return false;const evaluationText=this._textEditor.line(editorLineNumber).substring(startHighlight,endHighlight+1);const resolvedText=await Sources.SourceMapNamesResolver.resolveExpression((selectedCallFrame),evaluationText,this._uiSourceCode,editorLineNumber,startHighlight,endHighlight);const result=await selectedCallFrame.evaluate({expression:resolvedText||evaluationText,objectGroup:'popover',includeCommandLineAPI:false,silent:true,returnByValue:false,generatePreview:false});if(!result.object)
return false;objectPopoverHelper=await ObjectUI.ObjectPopoverHelper.buildObjectPopover(result.object,popover);const potentiallyUpdatedCallFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!objectPopoverHelper||selectedCallFrame!==potentiallyUpdatedCallFrame){debuggerModel.runtimeModel().releaseObjectGroup('popover');if(objectPopoverHelper)
objectPopoverHelper.dispose();return false;}
const highlightRange=new TextUtils.TextRange(editorLineNumber,startHighlight,editorLineNumber,endHighlight);highlightDescriptor=this._textEditor.highlightRange(highlightRange,'source-frame-eval-expression');return true;},hide:()=>{objectPopoverHelper.dispose();debuggerModel.runtimeModel().releaseObjectGroup('popover');this._textEditor.removeHighlight(highlightDescriptor);}};}
_onKeyDown(event){this._clearControlDown();if(event.key==='Escape'){if(this._popoverHelper.isPopoverVisible()){this._popoverHelper.hidePopover();event.consume();}
return;}
if(UI.shortcutRegistry.eventMatchesAction(event,'debugger.toggle-breakpoint')){const selection=this._textEditor.selection();if(!selection)
return;this._toggleBreakpoint(selection.startLine,false);event.consume(true);return;}
if(UI.shortcutRegistry.eventMatchesAction(event,'debugger.toggle-breakpoint-enabled')){const selection=this._textEditor.selection();if(!selection)
return;this._toggleBreakpoint(selection.startLine,true);event.consume(true);return;}
if(UI.shortcutRegistry.eventMatchesAction(event,'debugger.breakpoint-input-window')){const selection=this._textEditor.selection();if(!selection)
return;const breakpoints=this._lineBreakpointDecorations(selection.startLine).map(decoration=>decoration.breakpoint).filter(breakpoint=>!!breakpoint);let breakpoint;if(breakpoints.length)
breakpoint=breakpoints[0];const isLogpoint=breakpoint?breakpoint.condition().includes(Sources.BreakpointEditDialog.LogpointPrefix):false;this._editBreakpointCondition(selection.startLine,breakpoint,null,isLogpoint);event.consume(true);return;}
if(UI.KeyboardShortcut.eventHasCtrlOrMeta(event)&&this._executionLocation){this._controlDown=true;if(event.key===(Host.isMac()?'Meta':'Control')){this._controlTimeout=setTimeout(()=>{if(this._executionLocation&&this._controlDown)
this._showContinueToLocations();},150);}}}
_onMouseMove(event){if(this._executionLocation&&this._controlDown&&UI.KeyboardShortcut.eventHasCtrlOrMeta(event)){if(!this._continueToLocationDecorations)
this._showContinueToLocations();}
if(this._continueToLocationDecorations){const textPosition=this._textEditor.coordinatesToCursorPosition(event.x,event.y);const hovering=!!event.target.enclosingNodeOrSelfWithClass('source-frame-async-step-in');this._setAsyncStepInHoveredLine(textPosition?textPosition.startLine:null,hovering);}}
_setAsyncStepInHoveredLine(editorLineNumber,hovered){if(this._asyncStepInHoveredLine===editorLineNumber&&this._asyncStepInHovered===hovered)
return;if(this._asyncStepInHovered&&this._asyncStepInHoveredLine)
this._textEditor.toggleLineClass(this._asyncStepInHoveredLine,'source-frame-async-step-in-hovered',false);this._asyncStepInHoveredLine=editorLineNumber;this._asyncStepInHovered=hovered;if(this._asyncStepInHovered&&this._asyncStepInHoveredLine)
this._textEditor.toggleLineClass(this._asyncStepInHoveredLine,'source-frame-async-step-in-hovered',true);}
_onMouseDown(event){if(!this._executionLocation||!UI.KeyboardShortcut.eventHasCtrlOrMeta(event))
return;if(!this._continueToLocationDecorations)
return;event.consume();const textPosition=this._textEditor.coordinatesToCursorPosition(event.x,event.y);if(!textPosition)
return;for(const decoration of this._continueToLocationDecorations.keys()){const range=decoration.find();if(range.from.line!==textPosition.startLine||range.to.line!==textPosition.startLine)
continue;if(range.from.ch<=textPosition.startColumn&&textPosition.startColumn<=range.to.ch){this._continueToLocationDecorations.get(decoration)();break;}}}
_onBlur(event){if(this._textEditor.element.isAncestor((event.target)))
return;this._clearControlDown();}
_onKeyUp(event){this._clearControlDown();}
_clearControlDown(){this._controlDown=false;this._clearContinueToLocations();clearTimeout(this._controlTimeout);}
async _editBreakpointCondition(editorLineNumber,breakpoint,location,preferLogpoint){const oldCondition=breakpoint?breakpoint.condition():'';const decorationElement=createElement('div');const dialog=new Sources.BreakpointEditDialog(editorLineNumber,oldCondition,!!preferLogpoint,result=>{dialog.detach();this._textEditor.removeDecoration(decorationElement,editorLineNumber);if(!result.committed)
return;if(breakpoint)
breakpoint.setCondition(result.condition);else if(location)
this._setBreakpoint(location.lineNumber,location.columnNumber,result.condition,true);else
this._createNewBreakpoint(editorLineNumber,result.condition,true);});this._textEditor.addDecoration(decorationElement,editorLineNumber);dialog.show(decorationElement);}
_executionLineChanged(liveLocation){this._clearExecutionLine();const uiLocation=liveLocation.uiLocation();if(!uiLocation||uiLocation.uiSourceCode!==this._uiSourceCode){this._executionLocation=null;return;}
this._executionLocation=uiLocation;const editorLocation=this._transformer.rawToEditorLocation(uiLocation.lineNumber,uiLocation.columnNumber);this._textEditor.setExecutionLocation(editorLocation[0],editorLocation[1]);if(this._textEditor.isShowing()){setImmediate(()=>{if(this._controlDown)
this._showContinueToLocations();else
this._generateValuesInSource();});}}
_generateValuesInSource(){if(!Common.moduleSetting('inlineVariableValues').get())
return;const executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;const localScope=callFrame.localScope();const functionLocation=callFrame.functionLocation();if(localScope&&functionLocation){Sources.SourceMapNamesResolver.resolveScopeInObject(localScope).getAllProperties(false,false).then(this._prepareScopeVariables.bind(this,callFrame));}}
_showContinueToLocations(){this._popoverHelper.hidePopover();const executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;const start=callFrame.functionLocation()||callFrame.location();const debuggerModel=callFrame.debuggerModel;debuggerModel.getPossibleBreakpoints(start,null,true).then(locations=>this._textEditor.operation(renderLocations.bind(this,locations)));function renderLocations(locations){this._clearContinueToLocationsNoRestore();this._textEditor.hideExecutionLineBackground();this._clearValueWidgets();this._continueToLocationDecorations=new Map();locations=locations.reverse();let previousCallLine=-1;for(const location of locations){const editorLocation=this._transformer.rawToEditorLocation(location.lineNumber,location.columnNumber);let token=this._textEditor.tokenAtTextPosition(editorLocation[0],editorLocation[1]);if(!token)
continue;const line=this._textEditor.line(editorLocation[0]);let tokenContent=line.substring(token.startColumn,token.endColumn);if(!token.type&&tokenContent==='.'){token=this._textEditor.tokenAtTextPosition(editorLocation[0],token.endColumn+1);tokenContent=line.substring(token.startColumn,token.endColumn);}
if(!token.type)
continue;const validKeyword=token.type==='js-keyword'&&(tokenContent==='this'||tokenContent==='return'||tokenContent==='new'||tokenContent==='continue'||tokenContent==='break');if(!validKeyword&&!this._isIdentifier(token.type))
continue;if(previousCallLine===editorLocation[0]&&location.type!==Protocol.Debugger.BreakLocationType.Call)
continue;let highlightRange=new TextUtils.TextRange(editorLocation[0],token.startColumn,editorLocation[0],token.endColumn-1);let decoration=this._textEditor.highlightRange(highlightRange,'source-frame-continue-to-location');this._continueToLocationDecorations.set(decoration,location.continueToLocation.bind(location));if(location.type===Protocol.Debugger.BreakLocationType.Call)
previousCallLine=editorLocation[0];let isAsyncCall=(line[token.startColumn-1]==='.'&&tokenContent==='then')||tokenContent==='setTimeout'||tokenContent==='setInterval'||tokenContent==='postMessage';if(tokenContent==='new'){token=this._textEditor.tokenAtTextPosition(editorLocation[0],token.endColumn+1);tokenContent=line.substring(token.startColumn,token.endColumn);isAsyncCall=tokenContent==='Worker';}
const isCurrentPosition=this._executionLocation&&location.lineNumber===this._executionLocation.lineNumber&&location.columnNumber===this._executionLocation.columnNumber;if(location.type===Protocol.Debugger.BreakLocationType.Call&&isAsyncCall){const asyncStepInRange=this._findAsyncStepInRange(this._textEditor,editorLocation[0],line,token.endColumn);if(asyncStepInRange){highlightRange=new TextUtils.TextRange(editorLocation[0],asyncStepInRange.from,editorLocation[0],asyncStepInRange.to-1);decoration=this._textEditor.highlightRange(highlightRange,'source-frame-async-step-in');this._continueToLocationDecorations.set(decoration,this._asyncStepIn.bind(this,location,!!isCurrentPosition));}}}
this._continueToLocationRenderedForTest();}}
_continueToLocationRenderedForTest(){}
_findAsyncStepInRange(textEditor,editorLineNumber,line,column){let token;let tokenText;let from=column;let to=line.length;let position=line.indexOf('(',column);const argumentsStart=position;if(position===-1)
return null;position++;skipWhitespace();if(position>=line.length)
return null;nextToken();if(!token)
return null;from=token.startColumn;if(token.type==='js-keyword'&&tokenText==='async'){skipWhitespace();if(position>=line.length)
return{from:from,to:to};nextToken();if(!token)
return{from:from,to:to};}
if(token.type==='js-keyword'&&tokenText==='function')
return{from:from,to:to};if(token.type==='js-string')
return{from:argumentsStart,to:to};if(token.type&&this._isIdentifier(token.type))
return{from:from,to:to};if(tokenText!=='(')
return null;const closeParen=line.indexOf(')',position);if(closeParen===-1||line.substring(position,closeParen).indexOf('(')!==-1)
return{from:from,to:to};return{from:from,to:closeParen+1};function nextToken(){token=textEditor.tokenAtTextPosition(editorLineNumber,position);if(token){position=token.endColumn;to=token.endColumn;tokenText=line.substring(token.startColumn,token.endColumn);}}
function skipWhitespace(){while(position<line.length){if(line[position]===' '){position++;continue;}
const token=textEditor.tokenAtTextPosition(editorLineNumber,position);if(token.type==='js-comment'){position=token.endColumn;continue;}
break;}}}
_asyncStepIn(location,isCurrentPosition){if(!isCurrentPosition)
location.continueToLocation(asyncStepIn);else
asyncStepIn();function asyncStepIn(){location.debuggerModel.scheduleStepIntoAsync();}}
_prepareScopeVariables(callFrame,allProperties){const properties=allProperties.properties;this._clearValueWidgets();if(!properties||!properties.length||properties.length>500||!this._textEditor.isShowing())
return;const functionUILocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation((callFrame.functionLocation()));const executionUILocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(callFrame.location());if(!functionUILocation||!executionUILocation||functionUILocation.uiSourceCode!==this._uiSourceCode||executionUILocation.uiSourceCode!==this._uiSourceCode)
return;const functionEditorLocation=this._transformer.rawToEditorLocation(functionUILocation.lineNumber,functionUILocation.columnNumber);const executionEditorLocation=this._transformer.rawToEditorLocation(executionUILocation.lineNumber,executionUILocation.columnNumber);const fromLine=functionEditorLocation[0];const fromColumn=functionEditorLocation[1];const toLine=executionEditorLocation[0];if(fromLine>=toLine||toLine-fromLine>500||fromLine<0||toLine>=this._textEditor.linesCount)
return;const valuesMap=new Map();for(const property of properties)
valuesMap.set(property.name,property.value);const namesPerLine=new Map();let skipObjectProperty=false;const tokenizer=new TextEditor.CodeMirrorUtils.TokenizerFactory().createTokenizer('text/javascript');tokenizer(this._textEditor.line(fromLine).substring(fromColumn),processToken.bind(this,fromLine));for(let i=fromLine+1;i<toLine;++i)
tokenizer(this._textEditor.line(i),processToken.bind(this,i));function processToken(editorLineNumber,tokenValue,tokenType,column,newColumn){if(!skipObjectProperty&&tokenType&&this._isIdentifier(tokenType)&&valuesMap.get(tokenValue)){let names=namesPerLine.get(editorLineNumber);if(!names){names=new Set();namesPerLine.set(editorLineNumber,names);}
names.add(tokenValue);}
skipObjectProperty=tokenValue==='.';}
this._textEditor.operation(this._renderDecorations.bind(this,valuesMap,namesPerLine,fromLine,toLine));}
_renderDecorations(valuesMap,namesPerLine,fromLine,toLine){const formatter=new ObjectUI.RemoteObjectPreviewFormatter();for(let i=fromLine;i<toLine;++i){const names=namesPerLine.get(i);const oldWidget=this._valueWidgets.get(i);if(!names){if(oldWidget){this._valueWidgets.delete(i);this._textEditor.removeDecoration(oldWidget,i);}
continue;}
const widget=createElementWithClass('div','text-editor-value-decoration');const base=this._textEditor.cursorPositionToCoordinates(i,0);const offset=this._textEditor.cursorPositionToCoordinates(i,this._textEditor.line(i).length);const codeMirrorLinesLeftPadding=4;const left=offset.x-base.x+codeMirrorLinesLeftPadding;widget.style.left=left+'px';widget.__nameToToken=new Map();let renderedNameCount=0;for(const name of names){if(renderedNameCount>10)
break;if(namesPerLine.get(i-1)&&namesPerLine.get(i-1).has(name))
continue;if(renderedNameCount)
widget.createTextChild(', ');const nameValuePair=widget.createChild('span');widget.__nameToToken.set(name,nameValuePair);nameValuePair.createTextChild(name+' = ');const value=valuesMap.get(name);const propertyCount=value.preview?value.preview.properties.length:0;const entryCount=value.preview&&value.preview.entries?value.preview.entries.length:0;if(value.preview&&propertyCount+entryCount<10){formatter.appendObjectPreview(nameValuePair,value.preview,false);}else{nameValuePair.appendChild(ObjectUI.ObjectPropertiesSection.createValueElement(value,false,false));}
++renderedNameCount;}
let widgetChanged=true;if(oldWidget){widgetChanged=false;for(const name of widget.__nameToToken.keys()){const oldText=oldWidget.__nameToToken.get(name)?oldWidget.__nameToToken.get(name).textContent:'';const newText=widget.__nameToToken.get(name)?widget.__nameToToken.get(name).textContent:'';if(newText!==oldText){widgetChanged=true;UI.runCSSAnimationOnce((widget.__nameToToken.get(name)),'source-frame-value-update-highlight');}}
if(widgetChanged){this._valueWidgets.delete(i);this._textEditor.removeDecoration(oldWidget,i);}}
if(widgetChanged){this._valueWidgets.set(i,widget);this._textEditor.addDecoration(widget,i);}}}
_clearExecutionLine(){this._textEditor.operation(()=>{if(this._executionLocation)
this._textEditor.clearExecutionLine();this._executionLocation=null;if(this._clearValueWidgetsTimer){clearTimeout(this._clearValueWidgetsTimer);this._clearValueWidgetsTimer=null;}
this._clearValueWidgetsTimer=setTimeout(this._clearValueWidgets.bind(this),1000);this._clearContinueToLocationsNoRestore();});}
_clearValueWidgets(){clearTimeout(this._clearValueWidgetsTimer);this._clearValueWidgetsTimer=null;this._textEditor.operation(()=>{for(const line of this._valueWidgets.keys())
this._textEditor.removeDecoration(this._valueWidgets.get(line),line);this._valueWidgets.clear();});}
_clearContinueToLocationsNoRestore(){if(!this._continueToLocationDecorations)
return;this._textEditor.operation(()=>{for(const decoration of this._continueToLocationDecorations.keys())
this._textEditor.removeHighlight(decoration);this._continueToLocationDecorations=null;this._setAsyncStepInHoveredLine(null,false);});}
_clearContinueToLocations(){if(!this._continueToLocationDecorations)
return;this._textEditor.operation(()=>{this._textEditor.showExecutionLineBackground();this._generateValuesInSource();this._clearContinueToLocationsNoRestore();});}
_lineBreakpointDecorations(lineNumber){return Array.from(this._breakpointDecorations).filter(decoration=>(decoration.handle.resolve()||{}).lineNumber===lineNumber);}
_breakpointDecoration(editorLineNumber,editorColumnNumber){for(const decoration of this._breakpointDecorations){const location=decoration.handle.resolve();if(!location)
continue;if(location.lineNumber===editorLineNumber&&location.columnNumber===editorColumnNumber)
return decoration;}
return null;}
_updateBreakpointDecoration(decoration){if(!this._scheduledBreakpointDecorationUpdates){this._scheduledBreakpointDecorationUpdates=new Set();setImmediate(()=>this._textEditor.operation(update.bind(this)));}
this._scheduledBreakpointDecorationUpdates.add(decoration);function update(){if(!this._scheduledBreakpointDecorationUpdates)
return;const editorLineNumbers=new Set();for(const decoration of this._scheduledBreakpointDecorationUpdates){const location=decoration.handle.resolve();if(!location)
continue;editorLineNumbers.add(location.lineNumber);}
this._scheduledBreakpointDecorationUpdates=null;let waitingForInlineDecorations=false;for(const lineNumber of editorLineNumbers){const decorations=this._lineBreakpointDecorations(lineNumber);updateGutter.call(this,lineNumber,decorations);if(this._possibleBreakpointsRequested.has(lineNumber)){waitingForInlineDecorations=true;continue;}
updateInlineDecorations.call(this,lineNumber,decorations);}
if(!waitingForInlineDecorations)
this._breakpointDecorationsUpdatedForTest();}
function updateGutter(editorLineNumber,decorations){this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint',false);this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint-disabled',false);this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint-conditional',false);if(decorations.length){decorations.sort(Sources.DebuggerPlugin.BreakpointDecoration.mostSpecificFirst);this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint',true);this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint-disabled',!decorations[0].enabled||this._muted);this._textEditor.toggleLineClass(editorLineNumber,'cm-breakpoint-conditional',!!decorations[0].condition);}}
function updateInlineDecorations(editorLineNumber,decorations){const actualBookmarks=new Set(decorations.map(decoration=>decoration.bookmark).filter(bookmark=>!!bookmark));const lineEnd=this._textEditor.line(editorLineNumber).length;const bookmarks=this._textEditor.bookmarks(new TextUtils.TextRange(editorLineNumber,0,editorLineNumber,lineEnd),Sources.DebuggerPlugin.BreakpointDecoration.bookmarkSymbol);for(const bookmark of bookmarks){if(!actualBookmarks.has(bookmark))
bookmark.clear();}
if(!decorations.length)
return;if(decorations.length>1){for(const decoration of decorations){decoration.update();if(!this._muted)
decoration.show();else
decoration.hide();}}else{decorations[0].update();decorations[0].hide();}}}
_breakpointDecorationsUpdatedForTest(){}
_inlineBreakpointClick(decoration,event){event.consume(true);if(decoration.breakpoint){if(event.shiftKey)
decoration.breakpoint.setEnabled(!decoration.breakpoint.enabled());else
decoration.breakpoint.remove();}else{const editorLocation=decoration.handle.resolve();if(!editorLocation)
return;const location=this._transformer.editorToRawLocation(editorLocation.lineNumber,editorLocation.columnNumber);this._setBreakpoint(location[0],location[1],decoration.condition,true);}}
_inlineBreakpointContextMenu(decoration,event){event.consume(true);const editorLocation=decoration.handle.resolve();if(!editorLocation)
return;const location=this._transformer.editorToRawLocation(editorLocation[0],editorLocation[1]);const contextMenu=new UI.ContextMenu(event);if(decoration.breakpoint){contextMenu.debugSection().appendItem(Common.UIString('Edit breakpoint\u2026'),this._editBreakpointCondition.bind(this,editorLocation.lineNumber,decoration.breakpoint,null));}else{contextMenu.debugSection().appendItem(Common.UIString('Add conditional breakpoint\u2026'),this._editBreakpointCondition.bind(this,editorLocation.lineNumber,null,editorLocation));contextMenu.debugSection().appendItem(ls`Add logpoint\u2026`,this._editBreakpointCondition.bind(this,editorLocation.lineNumber,null,editorLocation,true));contextMenu.debugSection().appendItem(Common.UIString('Never pause here'),this._setBreakpoint.bind(this,location[0],location[1],'false',true));}
contextMenu.show();}
_shouldIgnoreExternalBreakpointEvents(event){const uiLocation=(event.data.uiLocation);if(uiLocation.uiSourceCode!==this._uiSourceCode)
return true;if(this._muted)
return true;const scriptFiles=this._scriptFileForDebuggerModel.valuesArray();for(let i=0;i<scriptFiles.length;++i){if(scriptFiles[i].isDivergingFromVM()||scriptFiles[i].isMergingToVM())
return true;}
return false;}
_breakpointAdded(event){if(this._shouldIgnoreExternalBreakpointEvents(event))
return;const uiLocation=(event.data.uiLocation);const breakpoint=(event.data.breakpoint);this._addBreakpoint(uiLocation,breakpoint);}
_addBreakpoint(uiLocation,breakpoint){const editorLocation=this._transformer.rawToEditorLocation(uiLocation.lineNumber,uiLocation.columnNumber);const lineDecorations=this._lineBreakpointDecorations(uiLocation.lineNumber);let decoration=this._breakpointDecoration(editorLocation[0],editorLocation[1]);if(decoration){decoration.breakpoint=breakpoint;decoration.condition=breakpoint.condition();decoration.enabled=breakpoint.enabled();}else{const handle=this._textEditor.textEditorPositionHandle(editorLocation[0],editorLocation[1]);decoration=new Sources.DebuggerPlugin.BreakpointDecoration(this._textEditor,handle,breakpoint.condition(),breakpoint.enabled(),breakpoint);decoration.element.addEventListener('click',this._inlineBreakpointClick.bind(this,decoration),true);decoration.element.addEventListener('contextmenu',this._inlineBreakpointContextMenu.bind(this,decoration),true);this._breakpointDecorations.add(decoration);}
this._decorationByBreakpoint.set(breakpoint,decoration);this._updateBreakpointDecoration(decoration);if(breakpoint.enabled()&&!lineDecorations.length){this._possibleBreakpointsRequested.add(editorLocation[0]);const start=this._transformer.editorToRawLocation(editorLocation[0],0);const end=this._transformer.editorToRawLocation(editorLocation[0]+1,0);this._breakpointManager.possibleBreakpoints(this._uiSourceCode,new TextUtils.TextRange(start[0],start[1],end[0],end[1])).then(addInlineDecorations.bind(this,editorLocation[0]));}
function addInlineDecorations(editorLineNumber,possibleLocations){this._possibleBreakpointsRequested.delete(editorLineNumber);const decorations=this._lineBreakpointDecorations(editorLineNumber);for(const decoration of decorations)
this._updateBreakpointDecoration(decoration);if(!decorations.some(decoration=>!!decoration.breakpoint))
return;const columns=new Set();for(const decoration of decorations){const editorLocation=decoration.handle.resolve();if(!editorLocation)
continue;columns.add(editorLocation.columnNumber);}
for(const location of possibleLocations){const editorLocation=this._transformer.rawToEditorLocation(location.lineNumber,location.columnNumber);if(columns.has(editorLocation[1]))
continue;const handle=this._textEditor.textEditorPositionHandle(editorLocation[0],editorLocation[1]);const decoration=new Sources.DebuggerPlugin.BreakpointDecoration(this._textEditor,handle,'',false,null);decoration.element.addEventListener('click',this._inlineBreakpointClick.bind(this,decoration),true);decoration.element.addEventListener('contextmenu',this._inlineBreakpointContextMenu.bind(this,decoration),true);this._breakpointDecorations.add(decoration);this._updateBreakpointDecoration(decoration);}}}
_breakpointRemoved(event){if(this._shouldIgnoreExternalBreakpointEvents(event))
return;const uiLocation=(event.data.uiLocation);const breakpoint=(event.data.breakpoint);const decoration=this._decorationByBreakpoint.get(breakpoint);if(!decoration)
return;this._decorationByBreakpoint.delete(breakpoint);const editorLocation=this._transformer.rawToEditorLocation(uiLocation.lineNumber,uiLocation.columnNumber);decoration.breakpoint=null;decoration.enabled=false;const lineDecorations=this._lineBreakpointDecorations(editorLocation[0]);if(!lineDecorations.some(decoration=>!!decoration.breakpoint)){for(const lineDecoration of lineDecorations){this._breakpointDecorations.delete(lineDecoration);this._updateBreakpointDecoration(lineDecoration);}}else{this._updateBreakpointDecoration(decoration);}}
_initializeBreakpoints(){const breakpointLocations=this._breakpointManager.breakpointLocationsForUISourceCode(this._uiSourceCode);for(const breakpointLocation of breakpointLocations)
this._addBreakpoint(breakpointLocation.uiLocation,breakpointLocation.breakpoint);}
_updateLinesWithoutMappingHighlight(){const isSourceMapSource=!!Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._uiSourceCode);if(!isSourceMapSource)
return;const linesCount=this._textEditor.linesCount;for(let i=0;i<linesCount;++i){const lineHasMapping=Bindings.CompilerScriptMapping.uiLineHasMapping(this._uiSourceCode,i);if(!lineHasMapping)
this._hasLineWithoutMapping=true;if(this._hasLineWithoutMapping)
this._textEditor.toggleLineClass(i,'cm-line-without-source-mapping',!lineHasMapping);}}
_updateScriptFiles(){for(const debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)){const scriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(this._uiSourceCode,debuggerModel);if(scriptFile)
this._updateScriptFile(debuggerModel);}}
_updateScriptFile(debuggerModel){const oldScriptFile=this._scriptFileForDebuggerModel.get(debuggerModel);const newScriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(this._uiSourceCode,debuggerModel);this._scriptFileForDebuggerModel.delete(debuggerModel);if(oldScriptFile){oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);oldScriptFile.removeEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);if(this._muted&&!this._uiSourceCode.isDirty())
this._restoreBreakpointsIfConsistentScripts();}
if(!newScriptFile)
return;this._scriptFileForDebuggerModel.set(debuggerModel,newScriptFile);newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);newScriptFile.addEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);newScriptFile.checkMapping();if(newScriptFile.hasSourceMapURL())
this._showSourceMapInfobar();}
_showSourceMapInfobar(){if(this._sourceMapInfobar)
return;this._sourceMapInfobar=UI.Infobar.create(UI.Infobar.Type.Info,Common.UIString('Source Map detected.'),Common.settings.createSetting('sourceMapInfobarDisabled',false));if(!this._sourceMapInfobar)
return;this._sourceMapInfobar.createDetailsRowMessage(Common.UIString('Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.'));this._sourceMapInfobar.createDetailsRowMessage(Common.UIString('Associated files are available via file tree or %s.',UI.shortcutRegistry.shortcutTitleForAction('quickOpen.show')));this._sourceMapInfobar.setCloseCallback(()=>this._sourceMapInfobar=null);this._textEditor.attachInfobar(this._sourceMapInfobar);}
_detectMinified(){const content=this._uiSourceCode.content();if(!content||!TextUtils.isMinified(content))
return;this._prettyPrintInfobar=UI.Infobar.create(UI.Infobar.Type.Info,Common.UIString('Pretty-print this minified file?'),Common.settings.createSetting('prettyPrintInfobarDisabled',false));if(!this._prettyPrintInfobar)
return;this._prettyPrintInfobar.setCloseCallback(()=>this._prettyPrintInfobar=null);const toolbar=new UI.Toolbar('');const button=new UI.ToolbarButton('','largeicon-pretty-print');toolbar.appendToolbarItem(button);toolbar.element.style.display='inline-block';toolbar.element.style.verticalAlign='middle';toolbar.element.style.marginBottom='3px';toolbar.element.style.pointerEvents='none';const element=this._prettyPrintInfobar.createDetailsRowMessage();element.appendChild(UI.formatLocalized('You can click the %s button on the bottom status bar, and continue debugging with the new formatted source.',[toolbar.element]));this._textEditor.attachInfobar(this._prettyPrintInfobar);}
_handleGutterClick(event){if(this._muted)
return;const eventData=(event.data);const editorLineNumber=eventData.lineNumber;const eventObject=eventData.event;if(eventObject.button!==0||eventObject.altKey||eventObject.ctrlKey||eventObject.metaKey)
return;this._toggleBreakpoint(editorLineNumber,eventObject.shiftKey);eventObject.consume(true);}
_toggleBreakpoint(editorLineNumber,onlyDisable){const decorations=this._lineBreakpointDecorations(editorLineNumber);if(!decorations.length){this._createNewBreakpoint(editorLineNumber,'',true);return;}
const hasDisabled=this._textEditor.hasLineClass(editorLineNumber,'cm-breakpoint-disabled');const breakpoints=decorations.map(decoration=>decoration.breakpoint).filter(breakpoint=>!!breakpoint);for(const breakpoint of breakpoints){if(onlyDisable)
breakpoint.setEnabled(hasDisabled);else
breakpoint.remove();}}
async _createNewBreakpoint(editorLineNumber,condition,enabled){Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScriptsBreakpointSet);if(editorLineNumber<this._textEditor.linesCount){const lineLength=Math.min(this._textEditor.line(editorLineNumber).length,1024);const start=this._transformer.editorToRawLocation(editorLineNumber,0);const end=this._transformer.editorToRawLocation(editorLineNumber,lineLength);const locations=await this._breakpointManager.possibleBreakpoints(this._uiSourceCode,new TextUtils.TextRange(start[0],start[1],end[0],end[1]));if(locations&&locations.length){this._setBreakpoint(locations[0].lineNumber,locations[0].columnNumber,condition,enabled);return;}}
const origin=this._transformer.editorToRawLocation(editorLineNumber,0);await this._setBreakpoint(origin[0],origin[1],condition,enabled);}
toggleBreakpointOnCurrentLine(onlyDisable){if(this._muted)
return;const selection=this._textEditor.selection();if(!selection)
return;this._toggleBreakpoint(selection.startLine,onlyDisable);}
_setBreakpoint(lineNumber,columnNumber,condition,enabled){if(!Bindings.CompilerScriptMapping.uiLineHasMapping(this._uiSourceCode,lineNumber))
return;Common.moduleSetting('breakpointsActive').set(true);this._breakpointManager.setBreakpoint(this._uiSourceCode,lineNumber,columnNumber,condition,enabled);this._breakpointWasSetForTest(lineNumber,columnNumber,condition,enabled);}
_breakpointWasSetForTest(lineNumber,columnNumber,condition,enabled){}
_callFrameChanged(){this._liveLocationPool.disposeAll();const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame){this._clearExecutionLine();return;}
Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(callFrame.location(),this._executionLineChanged.bind(this),this._liveLocationPool);}
dispose(){for(const decoration of this._breakpointDecorations)
decoration.dispose();this._breakpointDecorations.clear();if(this._scheduledBreakpointDecorationUpdates){for(const decoration of this._scheduledBreakpointDecorationUpdates)
decoration.dispose();this._scheduledBreakpointDecorationUpdates.clear();}
this._hideBlackboxInfobar();if(this._sourceMapInfobar)
this._sourceMapInfobar.dispose();if(this._prettyPrintInfobar)
this._prettyPrintInfobar.dispose();this._scriptsPanel.element.removeEventListener('scroll',this._boundPopoverHelperHide,true);for(const script of this._scriptFileForDebuggerModel.values()){script.removeEventListener(Bindings.ResourceScriptFile.Events.DidMergeToVM,this._didMergeToVM,this);script.removeEventListener(Bindings.ResourceScriptFile.Events.DidDivergeFromVM,this._didDivergeFromVM,this);}
this._scriptFileForDebuggerModel.clear();this._textEditor.element.removeEventListener('keydown',this._boundKeyDown,true);this._textEditor.element.removeEventListener('keyup',this._boundKeyUp,true);this._textEditor.element.removeEventListener('mousemove',this._boundMouseMove,false);this._textEditor.element.removeEventListener('mousedown',this._boundMouseDown,true);this._textEditor.element.removeEventListener('focusout',this._boundBlur,false);this._textEditor.element.removeEventListener('wheel',this._boundWheel,true);this._textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick,this._handleGutterClick,this);this._popoverHelper.hidePopover();this._popoverHelper.dispose();this._breakpointManager.removeEventListener(Bindings.BreakpointManager.Events.BreakpointAdded,this._breakpointAdded,this);this._breakpointManager.removeEventListener(Bindings.BreakpointManager.Events.BreakpointRemoved,this._breakpointRemoved,this);this._uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._workingCopyChanged,this);this._uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._workingCopyCommitted,this);Common.moduleSetting('skipStackFramesPattern').removeChangeListener(this._showBlackboxInfobarIfNeeded,this);Common.moduleSetting('skipContentScripts').removeChangeListener(this._showBlackboxInfobarIfNeeded,this);super.dispose();this._clearExecutionLine();UI.context.removeFlavorChangeListener(SDK.DebuggerModel.CallFrame,this._callFrameChanged,this);this._liveLocationPool.disposeAll();}};Sources.DebuggerPlugin.BreakpointDecoration=class{constructor(textEditor,handle,condition,enabled,breakpoint){this._textEditor=textEditor;this.handle=handle;this.condition=condition;this.enabled=enabled;this.breakpoint=breakpoint;this.element=UI.Icon.create('smallicon-inline-breakpoint');this.element.classList.toggle('cm-inline-breakpoint',true);this.bookmark=null;}
static mostSpecificFirst(decoration1,decoration2){if(decoration1.enabled!==decoration2.enabled)
return decoration1.enabled?-1:1;if(!!decoration1.condition!==!!decoration2.condition)
return!!decoration1.condition?-1:1;return 0;}
update(){if(!this.condition)
this.element.setIconType('smallicon-inline-breakpoint');else
this.element.setIconType('smallicon-inline-breakpoint-conditional');this.element.classList.toggle('cm-inline-disabled',!this.enabled);}
show(){if(this.bookmark)
return;const editorLocation=this.handle.resolve();if(!editorLocation)
return;this.bookmark=this._textEditor.addBookmark(editorLocation.lineNumber,editorLocation.columnNumber,this.element,Sources.DebuggerPlugin.BreakpointDecoration.bookmarkSymbol);this.bookmark[Sources.DebuggerPlugin.BreakpointDecoration._elementSymbolForTest]=this.element;}
hide(){if(!this.bookmark)
return;this.bookmark.clear();this.bookmark=null;}
dispose(){const location=this.handle.resolve();if(location){this._textEditor.toggleLineClass(location.lineNumber,'cm-breakpoint',false);this._textEditor.toggleLineClass(location.lineNumber,'cm-breakpoint-disabled',false);this._textEditor.toggleLineClass(location.lineNumber,'cm-breakpoint-conditional',false);}
this.hide();}};Sources.DebuggerPlugin.BreakpointDecoration.bookmarkSymbol=Symbol('bookmark');Sources.DebuggerPlugin.BreakpointDecoration._elementSymbolForTest=Symbol('element');Sources.DebuggerPlugin.continueToLocationDecorationSymbol=Symbol('bookmark');;Sources.CSSPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor){super();this._textEditor=textEditor;this._swatchPopoverHelper=new InlineEditor.SwatchPopoverHelper();this._muteSwatchProcessing=false;this._hadSwatchChange=false;this._bezierEditor=null;this._editedSwatchTextRange=null;this._spectrum=null;this._currentSwatch=null;this._textEditor.configureAutocomplete({suggestionsCallback:this._cssSuggestions.bind(this),isWordChar:this._isWordChar.bind(this)});this._textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._textEditorScrolled,this);this._textEditor.addEventListener(UI.TextEditor.Events.TextChanged,this._onTextChanged,this);this._updateSwatches(0,this._textEditor.linesCount-1);this._shortcuts={};this._registerShortcuts();this._boundHandleKeyDown=this._handleKeyDown.bind(this);this._textEditor.element.addEventListener('keydown',this._boundHandleKeyDown,false);}
static accepts(uiSourceCode){return uiSourceCode.contentType().isStyleSheet();}
_registerShortcuts(){const shortcutKeys=UI.ShortcutsScreen.SourcesPanelShortcuts;for(const descriptor of shortcutKeys.IncreaseCSSUnitByOne)
this._shortcuts[descriptor.key]=this._handleUnitModification.bind(this,1);for(const descriptor of shortcutKeys.DecreaseCSSUnitByOne)
this._shortcuts[descriptor.key]=this._handleUnitModification.bind(this,-1);for(const descriptor of shortcutKeys.IncreaseCSSUnitByTen)
this._shortcuts[descriptor.key]=this._handleUnitModification.bind(this,10);for(const descriptor of shortcutKeys.DecreaseCSSUnitByTen)
this._shortcuts[descriptor.key]=this._handleUnitModification.bind(this,-10);}
_handleKeyDown(event){const shortcutKey=UI.KeyboardShortcut.makeKeyFromEvent((event));const handler=this._shortcuts[shortcutKey];if(handler&&handler())
event.consume(true);}
_textEditorScrolled(){if(this._swatchPopoverHelper.isShowing())
this._swatchPopoverHelper.hide(true);}
_modifyUnit(unit,change){const unitValue=parseInt(unit,10);if(isNaN(unitValue))
return null;const tail=unit.substring((unitValue).toString().length);return String.sprintf('%d%s',unitValue+change,tail);}
_handleUnitModification(change){const selection=this._textEditor.selection().normalize();let token=this._textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn);if(!token){if(selection.startColumn>0)
token=this._textEditor.tokenAtTextPosition(selection.startLine,selection.startColumn-1);if(!token)
return false;}
if(token.type!=='css-number')
return false;const cssUnitRange=new TextUtils.TextRange(selection.startLine,token.startColumn,selection.startLine,token.endColumn);const cssUnitText=this._textEditor.text(cssUnitRange);const newUnitText=this._modifyUnit(cssUnitText,change);if(!newUnitText)
return false;this._textEditor.editRange(cssUnitRange,newUnitText);selection.startColumn=token.startColumn;selection.endColumn=selection.startColumn+newUnitText.length;this._textEditor.setSelection(selection);return true;}
_updateSwatches(startLine,endLine){const swatches=[];const swatchPositions=[];const regexes=[SDK.CSSMetadata.VariableRegex,SDK.CSSMetadata.URLRegex,UI.Geometry.CubicBezier.Regex,Common.Color.Regex];const handlers=new Map();handlers.set(Common.Color.Regex,this._createColorSwatch.bind(this));handlers.set(UI.Geometry.CubicBezier.Regex,this._createBezierSwatch.bind(this));for(let lineNumber=startLine;lineNumber<=endLine;lineNumber++){const line=this._textEditor.line(lineNumber).substring(0,Sources.CSSPlugin.maxSwatchProcessingLength);const results=TextUtils.TextUtils.splitStringByRegexes(line,regexes);for(let i=0;i<results.length;i++){const result=results[i];if(result.regexIndex===-1||!handlers.has(regexes[result.regexIndex]))
continue;const delimiters=/[\s:;,(){}]/;const positionBefore=result.position-1;const positionAfter=result.position+result.value.length;if(positionBefore>=0&&!delimiters.test(line.charAt(positionBefore))||positionAfter<line.length&&!delimiters.test(line.charAt(positionAfter)))
continue;const swatch=handlers.get(regexes[result.regexIndex])(result.value);if(!swatch)
continue;swatches.push(swatch);swatchPositions.push(TextUtils.TextRange.createFromLocation(lineNumber,result.position));}}
this._textEditor.operation(putSwatchesInline.bind(this));function putSwatchesInline(){const clearRange=new TextUtils.TextRange(startLine,0,endLine,this._textEditor.line(endLine).length);this._textEditor.bookmarks(clearRange,Sources.CSSPlugin.SwatchBookmark).forEach(marker=>marker.clear());for(let i=0;i<swatches.length;i++){const swatch=swatches[i];const swatchPosition=swatchPositions[i];const bookmark=this._textEditor.addBookmark(swatchPosition.startLine,swatchPosition.startColumn,swatch,Sources.CSSPlugin.SwatchBookmark);swatch[Sources.CSSPlugin.SwatchBookmark]=bookmark;}}}
_createColorSwatch(text){const color=Common.Color.parse(text);if(!color)
return null;const swatch=InlineEditor.ColorSwatch.create();swatch.setColor(color);swatch.iconElement().title=Common.UIString('Open color picker.');swatch.iconElement().addEventListener('click',this._swatchIconClicked.bind(this,swatch),false);swatch.hideText(true);return swatch;}
_createBezierSwatch(text){if(!UI.Geometry.CubicBezier.parse(text))
return null;const swatch=InlineEditor.BezierSwatch.create();swatch.setBezierText(text);swatch.iconElement().title=Common.UIString('Open cubic bezier editor.');swatch.iconElement().addEventListener('click',this._swatchIconClicked.bind(this,swatch),false);swatch.hideText(true);return swatch;}
_swatchIconClicked(swatch,event){event.consume(true);this._hadSwatchChange=false;this._muteSwatchProcessing=true;const swatchPosition=swatch[Sources.CSSPlugin.SwatchBookmark].position();this._textEditor.setSelection(swatchPosition);this._editedSwatchTextRange=swatchPosition.clone();this._editedSwatchTextRange.endColumn+=swatch.textContent.length;this._currentSwatch=swatch;if(swatch instanceof InlineEditor.ColorSwatch)
this._showSpectrum(swatch);else if(swatch instanceof InlineEditor.BezierSwatch)
this._showBezierEditor(swatch);}
_showSpectrum(swatch){if(!this._spectrum){this._spectrum=new ColorPicker.Spectrum();this._spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged,this._spectrumResized,this);this._spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged,this._spectrumChanged,this);}
this._spectrum.setColor(swatch.color(),swatch.format());this._swatchPopoverHelper.show(this._spectrum,swatch.iconElement(),this._swatchPopoverHidden.bind(this));}
_spectrumResized(event){this._swatchPopoverHelper.reposition();}
_spectrumChanged(event){const colorString=(event.data);const color=Common.Color.parse(colorString);if(!color)
return;this._currentSwatch.setColor(color);this._changeSwatchText(colorString);}
_showBezierEditor(swatch){if(!this._bezierEditor){this._bezierEditor=new InlineEditor.BezierEditor();this._bezierEditor.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged,this._bezierChanged,this);}
let cubicBezier=UI.Geometry.CubicBezier.parse(swatch.bezierText());if(!cubicBezier){cubicBezier=(UI.Geometry.CubicBezier.parse('linear'));}
this._bezierEditor.setBezier(cubicBezier);this._swatchPopoverHelper.show(this._bezierEditor,swatch.iconElement(),this._swatchPopoverHidden.bind(this));}
_bezierChanged(event){const bezierString=(event.data);this._currentSwatch.setBezierText(bezierString);this._changeSwatchText(bezierString);}
_changeSwatchText(text){this._hadSwatchChange=true;this._textEditor.editRange((this._editedSwatchTextRange),text,'*swatch-text-changed');this._editedSwatchTextRange.endColumn=this._editedSwatchTextRange.startColumn+text.length;}
_swatchPopoverHidden(commitEdit){this._muteSwatchProcessing=false;if(!commitEdit&&this._hadSwatchChange)
this._textEditor.undo();}
_onTextChanged(event){if(!this._muteSwatchProcessing)
this._updateSwatches(event.data.newRange.startLine,event.data.newRange.endLine);}
_isWordChar(char){return TextUtils.TextUtils.isWordChar(char)||char==='.'||char==='-'||char==='$';}
_cssSuggestions(prefixRange,substituteRange){const prefix=this._textEditor.text(prefixRange);if(prefix.startsWith('$'))
return null;const propertyToken=this._backtrackPropertyToken(prefixRange.startLine,prefixRange.startColumn-1);if(!propertyToken)
return null;const line=this._textEditor.line(prefixRange.startLine);const tokenContent=line.substring(propertyToken.startColumn,propertyToken.endColumn);const propertyValues=SDK.cssMetadata().propertyValues(tokenContent);return Promise.resolve(propertyValues.filter(value=>value.startsWith(prefix)).map(value=>({text:value})));}
_backtrackPropertyToken(lineNumber,columnNumber){const backtrackDepth=10;let tokenPosition=columnNumber;const line=this._textEditor.line(lineNumber);let seenColon=false;for(let i=0;i<backtrackDepth&&tokenPosition>=0;++i){const token=this._textEditor.tokenAtTextPosition(lineNumber,tokenPosition);if(!token)
return null;if(token.type==='css-property')
return seenColon?token:null;if(token.type&&!(token.type.indexOf('whitespace')!==-1||token.type.startsWith('css-comment')))
return null;if(!token.type&&line.substring(token.startColumn,token.endColumn)===':'){if(!seenColon)
seenColon=true;else
return null;}
tokenPosition=token.startColumn-1;}
return null;}
dispose(){if(this._swatchPopoverHelper.isShowing())
this._swatchPopoverHelper.hide(true);this._textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._textEditorScrolled,this);this._textEditor.removeEventListener(UI.TextEditor.Events.TextChanged,this._onTextChanged,this);this._textEditor.bookmarks(this._textEditor.fullRange(),Sources.CSSPlugin.SwatchBookmark).forEach(marker=>marker.clear());this._textEditor.element.removeEventListener('keydown',this._boundHandleKeyDown,false);}};Sources.CSSPlugin.maxSwatchProcessingLength=300;Sources.CSSPlugin.SwatchBookmark=Symbol('swatch');;Sources.GutterDiffPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor,uiSourceCode){super();this._textEditor=textEditor;this._uiSourceCode=uiSourceCode;this._decorations=[];this._textEditor.installGutter(Sources.GutterDiffPlugin.DiffGutterType,true);this._workspaceDiff=WorkspaceDiff.workspaceDiff();this._workspaceDiff.subscribeToDiffChange(this._uiSourceCode,this._update,this);this._update();}
static accepts(uiSourceCode){return uiSourceCode.project().type()===Workspace.projectTypes.Network;}
_updateDecorations(removed,added){this._textEditor.operation(operation);function operation(){for(const decoration of removed)
decoration.remove();for(const decoration of added)
decoration.install();}}
_update(){if(this._uiSourceCode)
this._workspaceDiff.requestDiff(this._uiSourceCode).then(this._innerUpdate.bind(this));else
this._innerUpdate(null);}
_innerUpdate(lineDiff){if(!lineDiff){this._updateDecorations(this._decorations,[]);this._decorations=[];return;}
const oldDecorations=new Map();for(let i=0;i<this._decorations.length;++i){const decoration=this._decorations[i];const lineNumber=decoration.lineNumber();if(lineNumber===-1)
continue;oldDecorations.set(lineNumber,decoration);}
const diff=SourceFrame.SourceCodeDiff.computeDiff(lineDiff);const newDecorations=new Map();for(let i=0;i<diff.length;++i){const diffEntry=diff[i];for(let lineNumber=diffEntry.from;lineNumber<diffEntry.to;++lineNumber)
newDecorations.set(lineNumber,{lineNumber:lineNumber,type:diffEntry.type});}
const decorationDiff=oldDecorations.diff(newDecorations,(e1,e2)=>e1.type===e2.type);const addedDecorations=decorationDiff.added.map(entry=>new Sources.GutterDiffPlugin.GutterDecoration(this._textEditor,entry.lineNumber,entry.type));this._decorations=decorationDiff.equal.concat(addedDecorations);this._updateDecorations(decorationDiff.removed,addedDecorations);this._decorationsSetForTest(newDecorations);}
_decorationsSetForTest(decorations){}
async populateLineGutterContextMenu(contextMenu,lineNumber){Sources.GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu,this._uiSourceCode);}
async populateTextAreaContextMenu(contextMenu,lineNumber,columnNumber){Sources.GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu,this._uiSourceCode);}
static _appendRevealDiffContextMenu(contextMenu,uiSourceCode){if(!WorkspaceDiff.workspaceDiff().isUISourceCodeModified(uiSourceCode))
return;contextMenu.revealSection().appendItem(ls`Local Modifications...`,()=>{Common.Revealer.reveal(new WorkspaceDiff.DiffUILocation(uiSourceCode));});}
dispose(){for(const decoration of this._decorations)
decoration.remove();WorkspaceDiff.workspaceDiff().unsubscribeFromDiffChange(this._uiSourceCode,this._update,this);}};Sources.GutterDiffPlugin.GutterDecoration=class{constructor(textEditor,lineNumber,type){this._textEditor=textEditor;this._position=this._textEditor.textEditorPositionHandle(lineNumber,0);this._className='';if(type===SourceFrame.SourceCodeDiff.EditType.Insert)
this._className='diff-entry-insert';else if(type===SourceFrame.SourceCodeDiff.EditType.Delete)
this._className='diff-entry-delete';else if(type===SourceFrame.SourceCodeDiff.EditType.Modify)
this._className='diff-entry-modify';this.type=type;}
lineNumber(){const location=this._position.resolve();if(!location)
return-1;return location.lineNumber;}
install(){const location=this._position.resolve();if(!location)
return;const element=createElementWithClass('div','diff-marker');element.textContent='\u00A0';this._textEditor.setGutterDecoration(location.lineNumber,Sources.GutterDiffPlugin.DiffGutterType,element);this._textEditor.toggleLineClass(location.lineNumber,this._className,true);}
remove(){const location=this._position.resolve();if(!location)
return;this._textEditor.setGutterDecoration(location.lineNumber,Sources.GutterDiffPlugin.DiffGutterType,null);this._textEditor.toggleLineClass(location.lineNumber,this._className,false);}};Sources.GutterDiffPlugin.DiffGutterType='CodeMirror-gutter-diff';Sources.GutterDiffPlugin.ContextMenuProvider=class{appendApplicableItems(event,contextMenu,target){let uiSourceCode=(target);const binding=Persistence.persistence.binding(uiSourceCode);if(binding)
uiSourceCode=binding.network;Sources.GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu,uiSourceCode);}};;Sources.SearchSourcesView=class extends Search.SearchView{constructor(){super('sources');}
static async openSearch(query,searchImmediately){const view=UI.viewManager.view('sources.search-sources-tab');const location=await UI.viewManager.resolveLocation('drawer-view');location.appendView(view);await UI.viewManager.revealView((view));const widget=(await view.widget());widget.toggle(query,!!searchImmediately);return widget;}
createScope(){return new Sources.SourcesSearchScope();}};Sources.SearchSourcesView.ActionDelegate=class{handleAction(context,actionId){this._showSearch();return true;}
_showSearch(){const selection=UI.inspectorView.element.window().getSelection();let queryCandidate='';if(selection.rangeCount)
queryCandidate=selection.toString().replace(/\r?\n.*/,'');return Sources.SearchSourcesView.openSearch(queryCandidate);}};;Sources.NavigatorView=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('sources/navigatorView.css');this._placeholder=null;this._scriptsTree=new UI.TreeOutlineInShadow();this._scriptsTree.registerRequiredCSS('sources/navigatorTree.css');this._scriptsTree.setComparator(Sources.NavigatorView._treeElementsCompare);this.contentElement.appendChild(this._scriptsTree.element);this.setDefaultFocusedElement(this._scriptsTree.element);this._uiSourceCodeNodes=new Multimap();this._subfolderNodes=new Map();this._rootNode=new Sources.NavigatorRootTreeNode(this);this._rootNode.populate();this._frameNodes=new Map();this.contentElement.addEventListener('contextmenu',this.handleContextMenu.bind(this),false);UI.shortcutRegistry.addShortcutListener(this.contentElement,'sources.rename',this._renameShortcut.bind(this),true);this._navigatorGroupByFolderSetting=Common.moduleSetting('navigatorGroupByFolder');this._navigatorGroupByFolderSetting.addChangeListener(this._groupingChanged.bind(this));this._initGrouping();Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._onBindingChanged,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._onBindingChanged,this);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,this._targetNameChanged,this);SDK.targetManager.observeTargets(this);this._resetWorkspace(Workspace.workspace);this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));Bindings.networkProjectManager.addEventListener(Bindings.NetworkProjectManager.Events.FrameAttributionAdded,this._frameAttributionAdded,this);Bindings.networkProjectManager.addEventListener(Bindings.NetworkProjectManager.Events.FrameAttributionRemoved,this._frameAttributionRemoved,this);}
static _treeElementOrder(treeElement){if(treeElement._boostOrder)
return 0;if(!Sources.NavigatorView._typeOrders){const weights={};const types=Sources.NavigatorView.Types;weights[types.Root]=1;weights[types.Domain]=10;weights[types.FileSystemFolder]=1;weights[types.NetworkFolder]=1;weights[types.SourceMapFolder]=2;weights[types.File]=10;weights[types.Frame]=70;weights[types.Worker]=90;weights[types.FileSystem]=100;Sources.NavigatorView._typeOrders=weights;}
let order=Sources.NavigatorView._typeOrders[treeElement._nodeType];if(treeElement._uiSourceCode){const contentType=treeElement._uiSourceCode.contentType();if(contentType.isDocument())
order+=3;else if(contentType.isScript())
order+=5;else if(contentType.isStyleSheet())
order+=10;else
order+=15;}
return order;}
static appendSearchItem(contextMenu,path){function searchPath(){Sources.SearchSourcesView.openSearch(`file:${path.trim()}`);}
let searchLabel=Common.UIString('Search in folder');if(!path||!path.trim()){path='*';searchLabel=Common.UIString('Search in all files');}
contextMenu.viewSection().appendItem(searchLabel,searchPath);}
static _treeElementsCompare(treeElement1,treeElement2){const typeWeight1=Sources.NavigatorView._treeElementOrder(treeElement1);const typeWeight2=Sources.NavigatorView._treeElementOrder(treeElement2);if(typeWeight1>typeWeight2)
return 1;if(typeWeight1<typeWeight2)
return-1;return treeElement1.titleAsText().compareTo(treeElement2.titleAsText());}
setPlaceholder(placeholder){console.assert(!this._placeholder,'A placeholder widget was already set');this._placeholder=placeholder;placeholder.show(this.contentElement,this.contentElement.firstChild);updateVisibility.call(this);this._scriptsTree.addEventListener(UI.TreeOutline.Events.ElementAttached,updateVisibility.bind(this));this._scriptsTree.addEventListener(UI.TreeOutline.Events.ElementsDetached,updateVisibility.bind(this));function updateVisibility(){const showTree=this._scriptsTree.firstChild();if(showTree)
placeholder.hideWidget();else
placeholder.showWidget();this._scriptsTree.element.classList.toggle('hidden',!showTree);}}
_onBindingChanged(event){const binding=(event.data);const networkNodes=this._uiSourceCodeNodes.get(binding.network);for(const networkNode of networkNodes)
networkNode.updateTitle();const fileSystemNodes=this._uiSourceCodeNodes.get(binding.fileSystem);for(const fileSystemNode of fileSystemNodes)
fileSystemNode.updateTitle();const pathTokens=Persistence.FileSystemWorkspaceBinding.relativePath(binding.fileSystem);let folderPath='';for(let i=0;i<pathTokens.length-1;++i){folderPath+=pathTokens[i];const folderId=this._folderNodeId(binding.fileSystem.project(),null,null,binding.fileSystem.origin(),folderPath);const folderNode=this._subfolderNodes.get(folderId);if(folderNode)
folderNode.updateTitle();folderPath+='/';}
const fileSystemRoot=this._rootNode.child(binding.fileSystem.project().id());if(fileSystemRoot)
fileSystemRoot.updateTitle();}
focus(){this._scriptsTree.focus();}
_resetWorkspace(workspace){this._workspace=workspace;this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);this._workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);this._workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded,event=>{const project=(event.data);this._projectAdded(project);if(project.type()===Workspace.projectTypes.FileSystem)
this._computeUniqueFileSystemProjectNames();});this._workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,event=>{const project=(event.data);this._removeProject(project);if(project.type()===Workspace.projectTypes.FileSystem)
this._computeUniqueFileSystemProjectNames();});this._workspace.projects().forEach(this._projectAdded.bind(this));this._computeUniqueFileSystemProjectNames();}
workspace(){return this._workspace;}
acceptProject(project){return!project.isServiceProject();}
_frameAttributionAdded(event){const uiSourceCode=(event.data.uiSourceCode);if(!this._acceptsUISourceCode(uiSourceCode))
return;const addedFrame=(event.data.frame);this._addUISourceCodeNode(uiSourceCode,addedFrame);}
_frameAttributionRemoved(event){const uiSourceCode=(event.data.uiSourceCode);if(!this._acceptsUISourceCode(uiSourceCode))
return;const removedFrame=(event.data.frame);const node=Array.from(this._uiSourceCodeNodes.get(uiSourceCode)).find(node=>node.frame()===removedFrame);this._removeUISourceCodeNode(node);}
_acceptsUISourceCode(uiSourceCode){return this.acceptProject(uiSourceCode.project());}
_addUISourceCode(uiSourceCode){if(!this._acceptsUISourceCode(uiSourceCode))
return;const frames=Bindings.NetworkProject.framesForUISourceCode(uiSourceCode);if(frames.length){for(const frame of frames)
this._addUISourceCodeNode(uiSourceCode,frame);}else{this._addUISourceCodeNode(uiSourceCode,null);}
this.uiSourceCodeAdded(uiSourceCode);}
_addUISourceCodeNode(uiSourceCode,frame){const isFromSourceMap=uiSourceCode.contentType().isFromSourceMap();let path;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem)
path=Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode).slice(0,-1);else
path=Common.ParsedURL.extractPath(uiSourceCode.url()).split('/').slice(1,-1);const project=uiSourceCode.project();const target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);const folderNode=this._folderNode(uiSourceCode,project,target,frame,uiSourceCode.origin(),path,isFromSourceMap);const uiSourceCodeNode=new Sources.NavigatorUISourceCodeTreeNode(this,uiSourceCode,frame);folderNode.appendChild(uiSourceCodeNode);this._uiSourceCodeNodes.set(uiSourceCode,uiSourceCodeNode);this._selectDefaultTreeNode();}
uiSourceCodeAdded(uiSourceCode){}
_uiSourceCodeAdded(event){const uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);}
_uiSourceCodeRemoved(event){const uiSourceCode=(event.data);this._removeUISourceCode(uiSourceCode);}
tryAddProject(project){this._projectAdded(project);project.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
_projectAdded(project){if(!this.acceptProject(project)||project.type()!==Workspace.projectTypes.FileSystem||Snippets.isSnippetsProject(project)||this._rootNode.child(project.id()))
return;this._rootNode.appendChild(new Sources.NavigatorGroupTreeNode(this,project,project.id(),Sources.NavigatorView.Types.FileSystem,project.displayName()));this._selectDefaultTreeNode();}
_selectDefaultTreeNode(){const children=this._rootNode.children();if(children.length&&!this._scriptsTree.selectedTreeElement)
children[0].treeNode().select(true,false);}
_computeUniqueFileSystemProjectNames(){const fileSystemProjects=this._workspace.projectsForType(Workspace.projectTypes.FileSystem);if(!fileSystemProjects.length)
return;const encoder=new Persistence.PathEncoder();const reversedPaths=fileSystemProjects.map(project=>{const fileSystem=(project);return encoder.encode(fileSystem.fileSystemPath()).reverse();});const reversedIndex=new Common.Trie();for(const reversedPath of reversedPaths)
reversedIndex.add(reversedPath);for(let i=0;i<fileSystemProjects.length;++i){const reversedPath=reversedPaths[i];const project=fileSystemProjects[i];reversedIndex.remove(reversedPath);const commonPrefix=reversedIndex.longestPrefix(reversedPath,false);reversedIndex.add(reversedPath);const path=encoder.decode(reversedPath.substring(0,commonPrefix.length+1).reverse());const fileSystemNode=this._rootNode.child(project.id());if(fileSystemNode)
fileSystemNode.setTitle(path);}}
_removeProject(project){const uiSourceCodes=project.uiSourceCodes();for(let i=0;i<uiSourceCodes.length;++i)
this._removeUISourceCode(uiSourceCodes[i]);if(project.type()!==Workspace.projectTypes.FileSystem)
return;const fileSystemNode=this._rootNode.child(project.id());if(!fileSystemNode)
return;this._rootNode.removeChild(fileSystemNode);}
_folderNodeId(project,target,frame,projectOrigin,path){const targetId=target?target.id():'';const projectId=project.type()===Workspace.projectTypes.FileSystem?project.id():'';const frameId=this._groupByFrame&&frame?frame.id:'';return targetId+':'+projectId+':'+frameId+':'+projectOrigin+':'+path;}
_folderNode(uiSourceCode,project,target,frame,projectOrigin,path,fromSourceMap){if(Snippets.isSnippetsUISourceCode(uiSourceCode))
return this._rootNode;if(target&&!this._groupByFolder&&!fromSourceMap)
return this._domainNode(uiSourceCode,project,target,frame,projectOrigin);const folderPath=path.join('/');const folderId=this._folderNodeId(project,target,frame,projectOrigin,folderPath);let folderNode=this._subfolderNodes.get(folderId);if(folderNode)
return folderNode;if(!path.length){if(target)
return this._domainNode(uiSourceCode,project,target,frame,projectOrigin);return(this._rootNode.child(project.id()));}
const parentNode=this._folderNode(uiSourceCode,project,target,frame,projectOrigin,path.slice(0,-1),fromSourceMap);let type=fromSourceMap?Sources.NavigatorView.Types.SourceMapFolder:Sources.NavigatorView.Types.NetworkFolder;if(project.type()===Workspace.projectTypes.FileSystem)
type=Sources.NavigatorView.Types.FileSystemFolder;const name=path[path.length-1];folderNode=new Sources.NavigatorFolderTreeNode(this,project,folderId,type,folderPath,name);this._subfolderNodes.set(folderId,folderNode);parentNode.appendChild(folderNode);return folderNode;}
_domainNode(uiSourceCode,project,target,frame,projectOrigin){const frameNode=this._frameNode(project,target,frame);if(!this._groupByDomain)
return frameNode;let domainNode=frameNode.child(projectOrigin);if(domainNode)
return domainNode;domainNode=new Sources.NavigatorGroupTreeNode(this,project,projectOrigin,Sources.NavigatorView.Types.Domain,this._computeProjectDisplayName(target,projectOrigin));if(frame&&projectOrigin===Common.ParsedURL.extractOrigin(frame.url))
domainNode.treeNode()._boostOrder=true;frameNode.appendChild(domainNode);return domainNode;}
_frameNode(project,target,frame){if(!this._groupByFrame||!frame)
return this._targetNode(project,target);let frameNode=this._frameNodes.get(frame);if(frameNode)
return frameNode;frameNode=new Sources.NavigatorGroupTreeNode(this,project,target.id()+':'+frame.id,Sources.NavigatorView.Types.Frame,frame.displayName());frameNode.setHoverCallback(hoverCallback);this._frameNodes.set(frame,frameNode);const parentFrame=frame.parentFrame||frame.crossTargetParentFrame();this._frameNode(project,parentFrame?parentFrame.resourceTreeModel().target():target,parentFrame).appendChild(frameNode);if(!parentFrame){frameNode.treeNode()._boostOrder=true;frameNode.treeNode().expand();}
function hoverCallback(hovered){if(hovered){const overlayModel=target.model(SDK.OverlayModel);if(overlayModel)
overlayModel.highlightFrame(frame.id);}else{SDK.OverlayModel.hideDOMNodeHighlight();}}
return frameNode;}
_targetNode(project,target){if(target===SDK.targetManager.mainTarget())
return this._rootNode;let targetNode=this._rootNode.child('target:'+target.id());if(!targetNode){targetNode=new Sources.NavigatorGroupTreeNode(this,project,'target:'+target.id(),target.type()===SDK.Target.Type.Frame?Sources.NavigatorView.Types.Frame:Sources.NavigatorView.Types.Worker,target.name());this._rootNode.appendChild(targetNode);}
return targetNode;}
_computeProjectDisplayName(target,projectOrigin){const runtimeModel=target.model(SDK.RuntimeModel);const executionContexts=runtimeModel?runtimeModel.executionContexts():[];for(const context of executionContexts){if(context.name&&context.origin&&projectOrigin.startsWith(context.origin))
return context.name;}
if(!projectOrigin)
return Common.UIString('(no domain)');const parsedURL=new Common.ParsedURL(projectOrigin);const prettyURL=parsedURL.isValid?parsedURL.host+(parsedURL.port?(':'+parsedURL.port):''):'';return(prettyURL||projectOrigin);}
revealUISourceCode(uiSourceCode,select){const nodes=this._uiSourceCodeNodes.get(uiSourceCode);const node=nodes.firstValue();if(!node)
return null;if(this._scriptsTree.selectedTreeElement)
this._scriptsTree.selectedTreeElement.deselect();this._lastSelectedUISourceCode=uiSourceCode;node.reveal(select);return node;}
_sourceSelected(uiSourceCode,focusSource){this._lastSelectedUISourceCode=uiSourceCode;Common.Revealer.reveal(uiSourceCode,!focusSource);}
_removeUISourceCode(uiSourceCode){const nodes=this._uiSourceCodeNodes.get(uiSourceCode);for(const node of nodes)
this._removeUISourceCodeNode(node);}
_removeUISourceCodeNode(node){const uiSourceCode=node.uiSourceCode();this._uiSourceCodeNodes.delete(uiSourceCode,node);const project=uiSourceCode.project();const target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);const frame=node.frame();let parentNode=node.parent;parentNode.removeChild(node);node=parentNode;while(node){parentNode=node.parent;if(!parentNode||!node.isEmpty())
break;if(parentNode===this._rootNode&&project.type()===Workspace.projectTypes.FileSystem)
break;if(!(node instanceof Sources.NavigatorGroupTreeNode||node instanceof Sources.NavigatorFolderTreeNode))
break;if(node._type===Sources.NavigatorView.Types.Frame){this._discardFrame((frame));break;}
const folderId=this._folderNodeId(project,target,frame,uiSourceCode.origin(),node._folderPath);this._subfolderNodes.delete(folderId);parentNode.removeChild(node);node=parentNode;}}
reset(){for(const node of this._uiSourceCodeNodes.valuesArray())
node.dispose();this._scriptsTree.removeChildren();this._uiSourceCodeNodes.clear();this._subfolderNodes.clear();this._frameNodes.clear();this._rootNode.reset();}
handleContextMenu(event){}
_renameShortcut(){const node=this._scriptsTree.selectedTreeElement&&this._scriptsTree.selectedTreeElement._node;if(!node||!node._uiSourceCode||!node._uiSourceCode.canRename())
return false;this.rename(node,false);return true;}
_handleContextMenuCreate(project,path,uiSourceCode){if(uiSourceCode){const relativePath=Persistence.FileSystemWorkspaceBinding.relativePath(uiSourceCode);relativePath.pop();path=relativePath.join('/');}
this.create(project,path,uiSourceCode);}
_handleContextMenuRename(node){this.rename(node,false);}
_handleContextMenuExclude(project,path){const shouldExclude=window.confirm(Common.UIString('Are you sure you want to exclude this folder?'));if(shouldExclude){UI.startBatchUpdate();project.excludeFolder(Persistence.FileSystemWorkspaceBinding.completeURL(project,path));UI.endBatchUpdate();}}
_handleContextMenuDelete(uiSourceCode){const shouldDelete=window.confirm(Common.UIString('Are you sure you want to delete this file?'));if(shouldDelete)
uiSourceCode.project().deleteFile(uiSourceCode);}
handleFileContextMenu(event,node){const uiSourceCode=node.uiSourceCode();const contextMenu=new UI.ContextMenu(event);contextMenu.appendApplicableItems(uiSourceCode);const project=uiSourceCode.project();if(project.type()===Workspace.projectTypes.FileSystem){contextMenu.editSection().appendItem(Common.UIString('Rename\u2026'),this._handleContextMenuRename.bind(this,node));contextMenu.editSection().appendItem(Common.UIString('Make a copy\u2026'),this._handleContextMenuCreate.bind(this,project,'',uiSourceCode));contextMenu.editSection().appendItem(Common.UIString('Delete'),this._handleContextMenuDelete.bind(this,uiSourceCode));}
contextMenu.show();}
handleFolderContextMenu(event,node){const path=node._folderPath||'';const project=node._project;const contextMenu=new UI.ContextMenu(event);Sources.NavigatorView.appendSearchItem(contextMenu,path);const folderPath=Common.ParsedURL.urlToPlatformPath(Persistence.FileSystemWorkspaceBinding.completeURL(project,path),Host.isWin());contextMenu.revealSection().appendItem(Common.UIString('Open folder'),()=>InspectorFrontendHost.showItemInFolder(folderPath));if(project.canCreateFile()){contextMenu.defaultSection().appendItem(Common.UIString('New file'),this._handleContextMenuCreate.bind(this,project,path));}
if(project.canExcludeFolder(path)){contextMenu.defaultSection().appendItem(Common.UIString('Exclude folder'),this._handleContextMenuExclude.bind(this,project,path));}
function removeFolder(){const shouldRemove=window.confirm(Common.UIString('Are you sure you want to remove this folder?'));if(shouldRemove)
project.remove();}
if(project.type()===Workspace.projectTypes.FileSystem){contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace',undefined,true);if(node instanceof Sources.NavigatorGroupTreeNode)
contextMenu.defaultSection().appendItem(Common.UIString('Remove folder from workspace'),removeFolder);}
contextMenu.show();}
rename(node,creatingNewUISourceCode){const uiSourceCode=node.uiSourceCode();node.rename(callback.bind(this));function callback(committed){if(!creatingNewUISourceCode)
return;if(!committed)
uiSourceCode.remove();else if(node._treeElement.listItemElement.hasFocus())
this._sourceSelected(uiSourceCode,true);}}
async create(project,path,uiSourceCodeToCopy){let content='';if(uiSourceCodeToCopy)
content=(await uiSourceCodeToCopy.requestContent())||'';const uiSourceCode=await project.createFile(path,null,content);if(!uiSourceCode)
return;this._sourceSelected(uiSourceCode,false);const node=this.revealUISourceCode(uiSourceCode,true);if(node)
this.rename(node,true);}
_groupingChanged(){this.reset();this._initGrouping();this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
_initGrouping(){this._groupByFrame=true;this._groupByDomain=this._navigatorGroupByFolderSetting.get();this._groupByFolder=this._groupByDomain;}
_resetForTest(){this.reset();this._workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));}
_discardFrame(frame){const node=this._frameNodes.get(frame);if(!node)
return;if(node.parent)
node.parent.removeChild(node);this._frameNodes.delete(frame);for(const child of frame.childFrames)
this._discardFrame(child);}
targetAdded(target){}
targetRemoved(target){const targetNode=this._rootNode.child('target:'+target.id());if(targetNode)
this._rootNode.removeChild(targetNode);}
_targetNameChanged(event){const target=(event.data);const targetNode=this._rootNode.child('target:'+target.id());if(targetNode)
targetNode.setTitle(target.name());}};Sources.NavigatorView.Types={Domain:'domain',File:'file',FileSystem:'fs',FileSystemFolder:'fs-folder',Frame:'frame',NetworkFolder:'nw-folder',Root:'root',SourceMapFolder:'sm-folder',Worker:'worker'};Sources.NavigatorFolderTreeElement=class extends UI.TreeElement{constructor(navigatorView,type,title,hoverCallback){super('',true);this.listItemElement.classList.add('navigator-'+type+'-tree-item','navigator-folder-tree-item');this._nodeType=type;this.title=title;this.tooltip=title;this._navigatorView=navigatorView;this._hoverCallback=hoverCallback;let iconType='largeicon-navigator-folder';if(type===Sources.NavigatorView.Types.Domain)
iconType='largeicon-navigator-domain';else if(type===Sources.NavigatorView.Types.Frame)
iconType='largeicon-navigator-frame';else if(type===Sources.NavigatorView.Types.Worker)
iconType='largeicon-navigator-worker';this.setLeadingIcons([UI.Icon.create(iconType,'icon')]);}
async onpopulate(){this._node.populate();}
onattach(){this.collapse();this._node.onattach();this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this.listItemElement.addEventListener('mousemove',this._mouseMove.bind(this),false);this.listItemElement.addEventListener('mouseleave',this._mouseLeave.bind(this),false);}
setNode(node){this._node=node;const paths=[];while(node&&!node.isRoot()){paths.push(node._title);node=node.parent;}
paths.reverse();this.tooltip=paths.join('/');}
_handleContextMenuEvent(event){if(!this._node)
return;this.select();this._navigatorView.handleFolderContextMenu(event,this._node);}
_mouseMove(event){if(this._hovered||!this._hoverCallback)
return;this._hovered=true;this._hoverCallback(true);}
_mouseLeave(event){if(!this._hoverCallback)
return;this._hovered=false;this._hoverCallback(false);}};Sources.NavigatorSourceTreeElement=class extends UI.TreeElement{constructor(navigatorView,uiSourceCode,title,node){super('',false);this._nodeType=Sources.NavigatorView.Types.File;this._node=node;this.title=title;this.listItemElement.classList.add('navigator-'+uiSourceCode.contentType().name()+'-tree-item','navigator-file-tree-item');this.tooltip=uiSourceCode.url();this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;this.updateIcon();}
updateIcon(){const binding=Persistence.persistence.binding(this._uiSourceCode);if(binding){const container=createElementWithClass('span','icon-stack');let iconType='largeicon-navigator-file-sync';if(Snippets.isSnippetsUISourceCode(binding.fileSystem))
iconType='largeicon-navigator-snippet';const icon=UI.Icon.create(iconType,'icon');const badge=UI.Icon.create('badge-navigator-file-sync','icon-badge');if(Persistence.networkPersistenceManager.project()===binding.fileSystem.project())
badge.style.filter='hue-rotate(160deg)';container.appendChild(icon);container.appendChild(badge);container.title=Persistence.PersistenceUtils.tooltipForUISourceCode(this._uiSourceCode);this.setLeadingIcons([container]);}else{let iconType='largeicon-navigator-file';if(Snippets.isSnippetsUISourceCode(this._uiSourceCode))
iconType='largeicon-navigator-snippet';const defaultIcon=UI.Icon.create(iconType,'icon');this.setLeadingIcons([defaultIcon]);}}
get uiSourceCode(){return this._uiSourceCode;}
onattach(){this.listItemElement.draggable=true;this.listItemElement.addEventListener('click',this._onclick.bind(this),false);this.listItemElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this.listItemElement.addEventListener('dragstart',this._ondragstart.bind(this),false);}
_shouldRenameOnMouseDown(){if(!this._uiSourceCode.canRename())
return false;const isSelected=this===this.treeOutline.selectedTreeElement;return isSelected&&this.treeOutline.element.hasFocus()&&!UI.isBeingEdited(this.treeOutline.element);}
selectOnMouseDown(event){if(event.which!==1||!this._shouldRenameOnMouseDown()){super.selectOnMouseDown(event);return;}
setTimeout(rename.bind(this),300);function rename(){if(this._shouldRenameOnMouseDown())
this._navigatorView.rename(this._node,false);}}
_ondragstart(event){event.dataTransfer.setData('text/plain',this._uiSourceCode.url());event.dataTransfer.effectAllowed='copy';}
onspace(){this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;}
_onclick(event){this._navigatorView._sourceSelected(this.uiSourceCode,false);}
ondblclick(event){const middleClick=event.button===1;this._navigatorView._sourceSelected(this.uiSourceCode,!middleClick);return false;}
onenter(){this._navigatorView._sourceSelected(this.uiSourceCode,true);return true;}
ondelete(){return true;}
_handleContextMenuEvent(event){this.select();this._navigatorView.handleFileContextMenu(event,this._node);}};Sources.NavigatorTreeNode=class{constructor(id,type){this.id=id;this._type=type;this._children=new Map();}
treeNode(){throw'Not implemented';}
dispose(){}
isRoot(){return false;}
hasChildren(){return true;}
onattach(){}
setTitle(title){throw'Not implemented';}
populate(){if(this.isPopulated())
return;if(this.parent)
this.parent.populate();this._populated=true;this.wasPopulated();}
wasPopulated(){const children=this.children();for(let i=0;i<children.length;++i)
this.treeNode().appendChild((children[i].treeNode()));}
didAddChild(node){if(this.isPopulated())
this.treeNode().appendChild((node.treeNode()));}
willRemoveChild(node){if(this.isPopulated())
this.treeNode().removeChild((node.treeNode()));}
isPopulated(){return this._populated;}
isEmpty(){return!this._children.size;}
children(){return this._children.valuesArray();}
child(id){return this._children.get(id)||null;}
appendChild(node){this._children.set(node.id,node);node.parent=this;this.didAddChild(node);}
removeChild(node){this.willRemoveChild(node);this._children.remove(node.id);delete node.parent;node.dispose();}
reset(){this._children.clear();}};Sources.NavigatorRootTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView){super('',Sources.NavigatorView.Types.Root);this._navigatorView=navigatorView;}
isRoot(){return true;}
treeNode(){return this._navigatorView._scriptsTree.rootElement();}};Sources.NavigatorUISourceCodeTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,uiSourceCode,frame){super(uiSourceCode.project().id()+':'+uiSourceCode.url(),Sources.NavigatorView.Types.File);this._navigatorView=navigatorView;this._uiSourceCode=uiSourceCode;this._treeElement=null;this._eventListeners=[];this._frame=frame;}
frame(){return this._frame;}
uiSourceCode(){return this._uiSourceCode;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=new Sources.NavigatorSourceTreeElement(this._navigatorView,this._uiSourceCode,'',this);this.updateTitle();const updateTitleBound=this.updateTitle.bind(this,undefined);this._eventListeners=[this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,updateTitleBound),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,updateTitleBound),this._uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,updateTitleBound)];return this._treeElement;}
updateTitle(ignoreIsDirty){if(!this._treeElement)
return;let titleText=this._uiSourceCode.displayName();if(!ignoreIsDirty&&this._uiSourceCode.isDirty())
titleText='*'+titleText;this._treeElement.title=titleText;this._treeElement.updateIcon();let tooltip=this._uiSourceCode.url();if(this._uiSourceCode.contentType().isFromSourceMap())
tooltip=Common.UIString('%s (from source map)',this._uiSourceCode.displayName());this._treeElement.tooltip=tooltip;}
hasChildren(){return false;}
dispose(){Common.EventTarget.removeEventListeners(this._eventListeners);}
reveal(select){this.parent.populate();this.parent.treeNode().expand();this._treeElement.reveal(true);if(select)
this._treeElement.select(true);}
rename(callback){if(!this._treeElement)
return;this._treeElement.listItemElement.focus();const treeOutlineElement=this._treeElement.treeOutline.element;UI.markBeingEdited(treeOutlineElement,true);function commitHandler(element,newTitle,oldTitle){if(newTitle!==oldTitle){this._treeElement.title=newTitle;this._uiSourceCode.rename(newTitle).then(renameCallback.bind(this));return;}
afterEditing.call(this,true);}
function renameCallback(success){if(!success){UI.markBeingEdited(treeOutlineElement,false);this.updateTitle();this.rename(callback);return;}
afterEditing.call(this,true);}
function afterEditing(committed){UI.markBeingEdited(treeOutlineElement,false);this.updateTitle();if(callback)
callback(committed);}
this.updateTitle(true);this._treeElement.startEditingTitle(new UI.InplaceEditor.Config(commitHandler.bind(this),afterEditing.bind(this,false)));}};Sources.NavigatorFolderTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,project,id,type,folderPath,title){super(id,type);this._navigatorView=navigatorView;this._project=project;this._folderPath=folderPath;this._title=title;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=this._createTreeElement(this._title,this);this.updateTitle();return this._treeElement;}
updateTitle(){if(!this._treeElement||this._project.type()!==Workspace.projectTypes.FileSystem)
return;const absoluteFileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id())+'/'+this._folderPath;const hasMappedFiles=Persistence.persistence.filePathHasBindings(absoluteFileSystemPath);this._treeElement.listItemElement.classList.toggle('has-mapped-files',hasMappedFiles);}
_createTreeElement(title,node){if(this._project.type()!==Workspace.projectTypes.FileSystem){try{title=decodeURI(title);}catch(e){}}
const treeElement=new Sources.NavigatorFolderTreeElement(this._navigatorView,this._type,title);treeElement.setNode(node);return treeElement;}
wasPopulated(){if(!this._treeElement||this._treeElement._node!==this)
return;this._addChildrenRecursive();}
_addChildrenRecursive(){const children=this.children();for(let i=0;i<children.length;++i){const child=children[i];this.didAddChild(child);if(child instanceof Sources.NavigatorFolderTreeNode)
child._addChildrenRecursive();}}
_shouldMerge(node){return this._type!==Sources.NavigatorView.Types.Domain&&node instanceof Sources.NavigatorFolderTreeNode;}
didAddChild(node){function titleForNode(node){return node._title;}
if(!this._treeElement)
return;let children=this.children();if(children.length===1&&this._shouldMerge(node)){node._isMerged=true;this._treeElement.title=this._treeElement.title+'/'+node._title;node._treeElement=this._treeElement;this._treeElement.setNode(node);return;}
let oldNode;if(children.length===2)
oldNode=children[0]!==node?children[0]:children[1];if(oldNode&&oldNode._isMerged){delete oldNode._isMerged;const mergedToNodes=[];mergedToNodes.push(this);let treeNode=this;while(treeNode._isMerged){treeNode=treeNode.parent;mergedToNodes.push(treeNode);}
mergedToNodes.reverse();const titleText=mergedToNodes.map(titleForNode).join('/');const nodes=[];treeNode=oldNode;do{nodes.push(treeNode);children=treeNode.children();treeNode=children.length===1?children[0]:null;}while(treeNode&&treeNode._isMerged);if(!this.isPopulated()){this._treeElement.title=titleText;this._treeElement.setNode(this);for(let i=0;i<nodes.length;++i){delete nodes[i]._treeElement;delete nodes[i]._isMerged;}
return;}
const oldTreeElement=this._treeElement;const treeElement=this._createTreeElement(titleText,this);for(let i=0;i<mergedToNodes.length;++i)
mergedToNodes[i]._treeElement=treeElement;oldTreeElement.parent.appendChild(treeElement);oldTreeElement.setNode(nodes[nodes.length-1]);oldTreeElement.title=nodes.map(titleForNode).join('/');oldTreeElement.parent.removeChild(oldTreeElement);this._treeElement.appendChild(oldTreeElement);if(oldTreeElement.expanded)
treeElement.expand();}
if(this.isPopulated())
this._treeElement.appendChild(node.treeNode());}
willRemoveChild(node){if(node._isMerged||!this.isPopulated())
return;this._treeElement.removeChild(node._treeElement);}};Sources.NavigatorGroupTreeNode=class extends Sources.NavigatorTreeNode{constructor(navigatorView,project,id,type,title){super(id,type);this._project=project;this._navigatorView=navigatorView;this._title=title;this.populate();}
setHoverCallback(hoverCallback){this._hoverCallback=hoverCallback;}
treeNode(){if(this._treeElement)
return this._treeElement;this._treeElement=new Sources.NavigatorFolderTreeElement(this._navigatorView,this._type,this._title,this._hoverCallback);this._treeElement.setNode(this);return this._treeElement;}
onattach(){this.updateTitle();}
updateTitle(){if(!this._treeElement||this._project.type()!==Workspace.projectTypes.FileSystem)
return;const fileSystemPath=Persistence.FileSystemWorkspaceBinding.fileSystemPath(this._project.id());const wasActive=this._treeElement.listItemElement.classList.contains('has-mapped-files');const isActive=Persistence.persistence.filePathHasBindings(fileSystemPath);if(wasActive===isActive)
return;this._treeElement.listItemElement.classList.toggle('has-mapped-files',isActive);if(this._treeElement.childrenListElement.hasFocus())
return;if(isActive)
this._treeElement.expand();else
this._treeElement.collapse();}
setTitle(title){this._title=title;if(this._treeElement)
this._treeElement.title=this._title;}};;Sources.ScopeChainSidebarPane=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('sources/scopeChainSidebarPane.css');this._expandController=new ObjectUI.ObjectPropertiesSectionExpandController();this._linkifier=new Components.Linkifier();this._update();}
flavorChanged(object){this._update();}
_update(){const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);const details=UI.context.flavor(SDK.DebuggerPausedDetails);this._linkifier.reset();Sources.SourceMapNamesResolver.resolveThisObject(callFrame).then(this._innerUpdate.bind(this,details,callFrame));}
_innerUpdate(details,callFrame,thisObject){this.contentElement.removeChildren();if(!details||!callFrame){const infoElement=createElement('div');infoElement.className='gray-info-message';infoElement.textContent=Common.UIString('Not paused');this.contentElement.appendChild(infoElement);return;}
let foundLocalScope=false;const scopeChain=callFrame.scopeChain();for(let i=0;i<scopeChain.length;++i){const scope=scopeChain[i];let title=scope.typeName();let emptyPlaceholder=null;const extraProperties=[];switch(scope.type()){case Protocol.Debugger.ScopeType.Local:foundLocalScope=true;emptyPlaceholder=Common.UIString('No variables');if(thisObject)
extraProperties.push(new SDK.RemoteObjectProperty('this',thisObject));if(i===0){const exception=details.exception();if(exception){extraProperties.push(new SDK.RemoteObjectProperty(Common.UIString('Exception'),exception,undefined,undefined,undefined,undefined,undefined,true));}
const returnValue=callFrame.returnValue();if(returnValue){extraProperties.push(new SDK.RemoteObjectProperty(Common.UIString('Return value'),returnValue,undefined,undefined,undefined,undefined,undefined,true,callFrame.setReturnValue.bind(callFrame)));}}
break;case Protocol.Debugger.ScopeType.Closure:const scopeName=scope.name();if(scopeName)
title=Common.UIString('Closure (%s)',UI.beautifyFunctionName(scopeName));else
title=Common.UIString('Closure');emptyPlaceholder=Common.UIString('No variables');break;}
let subtitle=scope.description();if(!title||title===subtitle)
subtitle=undefined;const titleElement=createElementWithClass('div','scope-chain-sidebar-pane-section-header');titleElement.createChild('div','scope-chain-sidebar-pane-section-subtitle').textContent=subtitle;titleElement.createChild('div','scope-chain-sidebar-pane-section-title').textContent=title;const section=new ObjectUI.ObjectPropertiesSection(Sources.SourceMapNamesResolver.resolveScopeInObject(scope),titleElement,this._linkifier,emptyPlaceholder,true,extraProperties);this._expandController.watchSection(title+(subtitle?':'+subtitle:''),section);if(scope.type()===Protocol.Debugger.ScopeType.Global)
section.objectTreeElement().collapse();else if(!foundLocalScope||scope.type()===Protocol.Debugger.ScopeType.Local)
section.objectTreeElement().expand();section.element.classList.add('scope-chain-sidebar-pane-section');this.contentElement.appendChild(section.element);}
this._sidebarPaneUpdatedForTest();}
_sidebarPaneUpdatedForTest(){}};Sources.ScopeChainSidebarPane._pathSymbol=Symbol('path');;Sources.NetworkNavigatorView=class extends Sources.NavigatorView{constructor(){super();SDK.targetManager.addEventListener(SDK.TargetManager.Events.InspectedURLChanged,this._inspectedURLChanged,this);Host.userMetrics.panelLoaded('sources','DevTools.Launch.Sources');}
acceptProject(project){return project.type()===Workspace.projectTypes.Network;}
_inspectedURLChanged(event){const mainTarget=SDK.targetManager.mainTarget();if(event.data!==mainTarget)
return;const inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;for(const uiSourceCode of this.workspace().uiSourceCodes()){if(this.acceptProject(uiSourceCode.project())&&uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}}
uiSourceCodeAdded(uiSourceCode){const mainTarget=SDK.targetManager.mainTarget();const inspectedURL=mainTarget&&mainTarget.inspectedURL();if(!inspectedURL)
return;if(uiSourceCode.url()===inspectedURL)
this.revealUISourceCode(uiSourceCode,true);}};Sources.FilesNavigatorView=class extends Sources.NavigatorView{constructor(){super();const placeholder=new UI.EmptyWidget('');this.setPlaceholder(placeholder);placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Sync changes in DevTools with the local filesystem`}</div><br />
      ${UI.XLink.create('https://developers.9oo91e.qjz9zk/web/tools/chrome-devtools/workspaces/', ls`Learn more`)}
    `);const toolbar=new UI.Toolbar('navigator-toolbar');toolbar.appendItemsAtLocation('files-navigator-toolbar').then(()=>{if(!toolbar.empty())
this.contentElement.insertBefore(toolbar.element,this.contentElement.firstChild);});}
acceptProject(project){return project.type()===Workspace.projectTypes.FileSystem&&Persistence.FileSystemWorkspaceBinding.fileSystemType(project)!=='overrides'&&!Snippets.isSnippetsProject(project);}
handleContextMenu(event){const contextMenu=new UI.ContextMenu(event);contextMenu.defaultSection().appendAction('sources.add-folder-to-workspace',undefined,true);contextMenu.show();}};Sources.OverridesNavigatorView=class extends Sources.NavigatorView{constructor(){super();const placeholder=new UI.EmptyWidget('');this.setPlaceholder(placeholder);placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Override page assets with files from a local folder`}</div><br />
      ${UI.XLink.create('https://developers.9oo91e.qjz9zk/web/updates/2018/01/devtools#overrides', ls`Learn more`)}
    `);this._toolbar=new UI.Toolbar('navigator-toolbar');this.contentElement.insertBefore(this._toolbar.element,this.contentElement.firstChild);Persistence.networkPersistenceManager.addEventListener(Persistence.NetworkPersistenceManager.Events.ProjectChanged,this._updateProjectAndUI,this);this.workspace().addEventListener(Workspace.Workspace.Events.ProjectAdded,this._onProjectAddOrRemoved,this);this.workspace().addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._onProjectAddOrRemoved,this);this._updateProjectAndUI();}
_onProjectAddOrRemoved(event){const project=(event.data);if(project&&project.type()===Workspace.projectTypes.FileSystem&&Persistence.FileSystemWorkspaceBinding.fileSystemType(project)!=='overrides')
return;this._updateUI();}
_updateProjectAndUI(){this.reset();const project=Persistence.networkPersistenceManager.project();if(project)
this.tryAddProject(project);this._updateUI();}
_updateUI(){this._toolbar.removeToolbarItems();const project=Persistence.networkPersistenceManager.project();if(project){const enableCheckbox=new UI.ToolbarSettingCheckbox(Common.settings.moduleSetting('persistenceNetworkOverridesEnabled'));this._toolbar.appendToolbarItem(enableCheckbox);this._toolbar.appendToolbarItem(new UI.ToolbarSeparator(true));const clearButton=new UI.ToolbarButton(Common.UIString('Clear configuration'),'largeicon-clear');clearButton.addEventListener(UI.ToolbarButton.Events.Click,()=>{project.remove();});this._toolbar.appendToolbarItem(clearButton);return;}
const title=Common.UIString('Select folder for overrides');const setupButton=new UI.ToolbarButton(title,'largeicon-add',title);setupButton.addEventListener(UI.ToolbarButton.Events.Click,this._setupNewWorkspace,this);this._toolbar.appendToolbarItem(setupButton);}
async _setupNewWorkspace(){const fileSystem=await Persistence.isolatedFileSystemManager.addFileSystem('overrides');if(!fileSystem)
return;Common.settings.moduleSetting('persistenceNetworkOverridesEnabled').set(true);}
acceptProject(project){return project===Persistence.networkPersistenceManager.project();}};Sources.ContentScriptsNavigatorView=class extends Sources.NavigatorView{constructor(){super();const placeholder=new UI.EmptyWidget('');this.setPlaceholder(placeholder);placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Content scripts served by extensions appear here`}</div><br />
      ${UI.XLink.create('https://developer.ch40me.qjz9zk/extensions/content_scripts', ls`Learn more`)}
    `);}
acceptProject(project){return project.type()===Workspace.projectTypes.ContentScripts;}};Sources.SnippetsNavigatorView=class extends Sources.NavigatorView{constructor(){super();const placeholder=new UI.EmptyWidget('');this.setPlaceholder(placeholder);placeholder.appendParagraph().appendChild(UI.html`
      <div>${ls`Create and save code snippets for later reuse`}</div><br />
      ${UI.XLink.create('https://developers.9oo91e.qjz9zk/web/tools/chrome-devtools/javascript/snippets', ls`Learn more`)}
    `);const toolbar=new UI.Toolbar('navigator-toolbar');const newButton=new UI.ToolbarButton('','largeicon-add',Common.UIString('New snippet'));newButton.addEventListener(UI.ToolbarButton.Events.Click,()=>this.create(Snippets.project,''));toolbar.appendToolbarItem(newButton);this.contentElement.insertBefore(toolbar.element,this.contentElement.firstChild);}
acceptProject(project){return Snippets.isSnippetsProject(project);}
handleContextMenu(event){const contextMenu=new UI.ContextMenu(event);contextMenu.headerSection().appendItem(Common.UIString('New'),()=>this.create(Snippets.project,''));contextMenu.show();}
handleFileContextMenu(event,node){const uiSourceCode=node.uiSourceCode();const contextMenu=new UI.ContextMenu(event);contextMenu.headerSection().appendItem(Common.UIString('Run'),()=>Snippets.evaluateScriptSnippet(uiSourceCode));contextMenu.editSection().appendItem(Common.UIString('Rename\u2026'),()=>this.rename(node,false));contextMenu.editSection().appendItem(Common.UIString('Remove'),()=>uiSourceCode.project().deleteFile(uiSourceCode));contextMenu.saveSection().appendItem(Common.UIString('Save as...'),this._handleSaveAs.bind(this,uiSourceCode));contextMenu.show();}
async _handleSaveAs(uiSourceCode){uiSourceCode.commitWorkingCopy();const content=await uiSourceCode.requestContent();Workspace.fileManager.save(uiSourceCode.url(),content,true);Workspace.fileManager.close(uiSourceCode.url());}};Sources.ActionDelegate=class{handleAction(context,actionId){switch(actionId){case'sources.create-snippet':Snippets.project.createFile('',null,'').then(uiSourceCode=>Common.Revealer.reveal(uiSourceCode));return true;case'sources.add-folder-to-workspace':Persistence.isolatedFileSystemManager.addFileSystem();return true;}
return false;}};;Sources.OutlineQuickOpen=class extends QuickOpen.FilteredListWidget.Provider{constructor(){super();this._items=[];this._active=false;}
attach(){this._items=[];this._active=false;const uiSourceCode=this._currentUISourceCode();if(uiSourceCode){this._active=Formatter.formatterWorkerPool().outlineForMimetype(uiSourceCode.workingCopy(),uiSourceCode.contentType().canonicalMimeType(),this._didBuildOutlineChunk.bind(this));}}
_didBuildOutlineChunk(isLastChunk,items){this._items.push(...items);this.refresh();}
itemCount(){return this._items.length;}
itemKeyAt(itemIndex){const item=this._items[itemIndex];return item.title+(item.subtitle?item.subtitle:'');}
itemScoreAt(itemIndex,query){const item=this._items[itemIndex];const methodName=query.split('(')[0];if(methodName.toLowerCase()===item.title.toLowerCase())
return 1/(1+item.line);return-item.line-1;}
renderItem(itemIndex,query,titleElement,subtitleElement){const item=this._items[itemIndex];titleElement.textContent=item.title+(item.subtitle?item.subtitle:'');QuickOpen.FilteredListWidget.highlightRanges(titleElement,query);subtitleElement.textContent=':'+(item.line+1);}
selectItem(itemIndex,promptValue){if(itemIndex===null)
return;const uiSourceCode=this._currentUISourceCode();if(!uiSourceCode)
return;const lineNumber=this._items[itemIndex].line;if(!isNaN(lineNumber)&&lineNumber>=0)
Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber,this._items[itemIndex].column));}
_currentUISourceCode(){const sourcesView=UI.context.flavor(Sources.SourcesView);if(!sourcesView)
return null;return sourcesView.currentUISourceCode();}
notFoundText(){if(!this._currentUISourceCode())
return Common.UIString('No file selected.');if(!this._active)
return Common.UIString('Open a JavaScript or CSS file to see symbols');return Common.UIString('No results found');}};;Sources.TabbedEditorContainerDelegate=function(){};Sources.TabbedEditorContainerDelegate.prototype={viewForFile(uiSourceCode){},recycleUISourceCodeFrame(sourceFrame,uiSourceCode){},};Sources.TabbedEditorContainer=class extends Common.Object{constructor(delegate,setting,placeholderElement){super();this._delegate=delegate;this._tabbedPane=new UI.TabbedPane();this._tabbedPane.setPlaceholderElement(placeholderElement);this._tabbedPane.setTabDelegate(new Sources.EditorContainerTabDelegate(this));this._tabbedPane.setCloseableTabs(true);this._tabbedPane.setAllowTabReorder(true,true);this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed,this._tabClosed,this);this._tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected,this._tabSelected,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingCreated,this._onBindingCreated,this);Persistence.persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved,this._onBindingRemoved,this);this._tabIds=new Map();this._files={};this._previouslyViewedFilesSetting=setting;this._history=Sources.TabbedEditorContainer.History.fromObject(this._previouslyViewedFilesSetting.get());}
_onBindingCreated(event){const binding=(event.data);this._updateFileTitle(binding.fileSystem);const networkTabId=this._tabIds.get(binding.network);let fileSystemTabId=this._tabIds.get(binding.fileSystem);const wasSelectedInNetwork=this._currentFile===binding.network;const currentSelectionRange=this._history.selectionRange(binding.network.url());const currentScrollLineNumber=this._history.scrollLineNumber(binding.network.url());this._history.remove(binding.network.url());if(!networkTabId)
return;if(!fileSystemTabId){const networkView=this._tabbedPane.tabView(networkTabId);const tabIndex=this._tabbedPane.tabIndex(networkTabId);if(networkView instanceof Sources.UISourceCodeFrame){this._delegate.recycleUISourceCodeFrame(networkView,binding.fileSystem);fileSystemTabId=this._appendFileTab(binding.fileSystem,false,tabIndex,networkView);}else{fileSystemTabId=this._appendFileTab(binding.fileSystem,false,tabIndex);const fileSystemTabView=(this._tabbedPane.tabView(fileSystemTabId));this._restoreEditorProperties(fileSystemTabView,currentSelectionRange,currentScrollLineNumber);}}
this._closeTabs([networkTabId],true);if(wasSelectedInNetwork)
this._tabbedPane.selectTab(fileSystemTabId,false);this._updateHistory();}
_onBindingRemoved(event){const binding=(event.data);this._updateFileTitle(binding.fileSystem);}
get view(){return this._tabbedPane;}
get visibleView(){return this._tabbedPane.visibleView;}
fileViews(){return(this._tabbedPane.tabViews());}
leftToolbar(){return this._tabbedPane.leftToolbar();}
rightToolbar(){return this._tabbedPane.rightToolbar();}
show(parentElement){this._tabbedPane.show(parentElement);}
showFile(uiSourceCode){this._innerShowFile(uiSourceCode,true);}
closeFile(uiSourceCode){const tabId=this._tabIds.get(uiSourceCode);if(!tabId)
return;this._closeTabs([tabId]);}
closeAllFiles(){this._closeTabs(this._tabbedPane.tabIds());}
historyUISourceCodes(){const uriToUISourceCode={};for(const id in this._files){const uiSourceCode=this._files[id];uriToUISourceCode[uiSourceCode.url()]=uiSourceCode;}
const result=[];const uris=this._history._urls();for(let i=0;i<uris.length;++i){const uiSourceCode=uriToUISourceCode[uris[i]];if(uiSourceCode)
result.push(uiSourceCode);}
return result;}
_addViewListeners(){if(!this._currentView||!this._currentView.textEditor)
return;this._currentView.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._scrollChanged,this);this._currentView.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.SelectionChanged,this._selectionChanged,this);}
_removeViewListeners(){if(!this._currentView||!this._currentView.textEditor)
return;this._currentView.textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.ScrollChanged,this._scrollChanged,this);this._currentView.textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.SelectionChanged,this._selectionChanged,this);}
_scrollChanged(event){if(this._scrollTimer)
clearTimeout(this._scrollTimer);const lineNumber=(event.data);this._scrollTimer=setTimeout(saveHistory.bind(this),100);this._history.updateScrollLineNumber(this._currentFile.url(),lineNumber);function saveHistory(){this._history.save(this._previouslyViewedFilesSetting);}}
_selectionChanged(event){const range=(event.data);this._history.updateSelectionRange(this._currentFile.url(),range);this._history.save(this._previouslyViewedFilesSetting);Extensions.extensionServer.sourceSelectionChanged(this._currentFile.url(),range);}
_innerShowFile(uiSourceCode,userGesture){const binding=Persistence.persistence.binding(uiSourceCode);uiSourceCode=binding?binding.fileSystem:uiSourceCode;if(this._currentFile===uiSourceCode)
return;this._removeViewListeners();this._currentFile=uiSourceCode;const tabId=this._tabIds.get(uiSourceCode)||this._appendFileTab(uiSourceCode,userGesture);this._tabbedPane.selectTab(tabId,userGesture);if(userGesture)
this._editorSelectedByUserAction();const previousView=this._currentView;this._currentView=this.visibleView;this._addViewListeners();const eventData={currentFile:this._currentFile,currentView:this._currentView,previousView:previousView,userGesture:userGesture};this.dispatchEventToListeners(Sources.TabbedEditorContainer.Events.EditorSelected,eventData);}
_titleForFile(uiSourceCode){const maxDisplayNameLength=30;let title=uiSourceCode.displayName(true).trimMiddle(maxDisplayNameLength);if(uiSourceCode.isDirty())
title+='*';return title;}
_maybeCloseTab(id,nextTabId){const uiSourceCode=this._files[id];const shouldPrompt=uiSourceCode.isDirty()&&uiSourceCode.project().canSetFileContent();if(!shouldPrompt||confirm(Common.UIString('Are you sure you want to close unsaved file: %s?',uiSourceCode.name()))){uiSourceCode.resetWorkingCopy();if(nextTabId)
this._tabbedPane.selectTab(nextTabId,true);this._tabbedPane.closeTab(id,true);return true;}
return false;}
_closeTabs(ids,forceCloseDirtyTabs){const dirtyTabs=[];const cleanTabs=[];for(let i=0;i<ids.length;++i){const id=ids[i];const uiSourceCode=this._files[id];if(!forceCloseDirtyTabs&&uiSourceCode.isDirty())
dirtyTabs.push(id);else
cleanTabs.push(id);}
if(dirtyTabs.length)
this._tabbedPane.selectTab(dirtyTabs[0],true);this._tabbedPane.closeTabs(cleanTabs,true);for(let i=0;i<dirtyTabs.length;++i){const nextTabId=i+1<dirtyTabs.length?dirtyTabs[i+1]:null;if(!this._maybeCloseTab(dirtyTabs[i],nextTabId))
break;}}
_onContextMenu(tabId,contextMenu){const uiSourceCode=this._files[tabId];if(uiSourceCode)
contextMenu.appendApplicableItems(uiSourceCode);}
addUISourceCode(uiSourceCode){const binding=Persistence.persistence.binding(uiSourceCode);uiSourceCode=binding?binding.fileSystem:uiSourceCode;if(this._currentFile===uiSourceCode)
return;const uri=uiSourceCode.url();const index=this._history.index(uri);if(index===-1)
return;if(!this._tabIds.has(uiSourceCode))
this._appendFileTab(uiSourceCode,false);if(!index){this._innerShowFile(uiSourceCode,false);return;}
if(!this._currentFile)
return;const currentProjectIsSnippets=Snippets.isSnippetsUISourceCode(this._currentFile);const addedProjectIsSnippets=Snippets.isSnippetsUISourceCode(uiSourceCode);if(this._history.index(this._currentFile.url())&&currentProjectIsSnippets&&!addedProjectIsSnippets)
this._innerShowFile(uiSourceCode,false);}
removeUISourceCode(uiSourceCode){this.removeUISourceCodes([uiSourceCode]);}
removeUISourceCodes(uiSourceCodes){const tabIds=[];for(let i=0;i<uiSourceCodes.length;++i){const uiSourceCode=uiSourceCodes[i];const tabId=this._tabIds.get(uiSourceCode);if(tabId)
tabIds.push(tabId);}
this._tabbedPane.closeTabs(tabIds);}
_editorClosedByUserAction(uiSourceCode){this._history.remove(uiSourceCode.url());this._updateHistory();}
_editorSelectedByUserAction(){this._updateHistory();}
_updateHistory(){const tabIds=this._tabbedPane.lastOpenedTabIds(Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount);function tabIdToURI(tabId){return this._files[tabId].url();}
this._history.update(tabIds.map(tabIdToURI.bind(this)));this._history.save(this._previouslyViewedFilesSetting);}
_tooltipForFile(uiSourceCode){uiSourceCode=Persistence.persistence.network(uiSourceCode)||uiSourceCode;return uiSourceCode.url();}
_appendFileTab(uiSourceCode,userGesture,index,replaceView){const view=replaceView||this._delegate.viewForFile(uiSourceCode);const title=this._titleForFile(uiSourceCode);const tooltip=this._tooltipForFile(uiSourceCode);const tabId=this._generateTabId();this._tabIds.set(uiSourceCode,tabId);this._files[tabId]=uiSourceCode;if(!replaceView){const savedSelectionRange=this._history.selectionRange(uiSourceCode.url());const savedScrollLineNumber=this._history.scrollLineNumber(uiSourceCode.url());this._restoreEditorProperties(view,savedSelectionRange,savedScrollLineNumber);}
this._tabbedPane.appendTab(tabId,title,view,tooltip,userGesture,undefined,index);this._updateFileTitle(uiSourceCode);this._addUISourceCodeListeners(uiSourceCode);return tabId;}
_restoreEditorProperties(editorView,selection,firstLineNumber){const sourceFrame=editorView instanceof SourceFrame.SourceFrame?(editorView):null;if(!sourceFrame)
return;if(selection)
sourceFrame.setSelection(selection);if(typeof firstLineNumber==='number')
sourceFrame.scrollToLine(firstLineNumber);}
_tabClosed(event){const tabId=(event.data.tabId);const userGesture=(event.data.isUserGesture);const uiSourceCode=this._files[tabId];if(this._currentFile===uiSourceCode){this._removeViewListeners();delete this._currentView;delete this._currentFile;}
this._tabIds.remove(uiSourceCode);delete this._files[tabId];this._removeUISourceCodeListeners(uiSourceCode);this.dispatchEventToListeners(Sources.TabbedEditorContainer.Events.EditorClosed,uiSourceCode);if(userGesture)
this._editorClosedByUserAction(uiSourceCode);}
_tabSelected(event){const tabId=(event.data.tabId);const userGesture=(event.data.isUserGesture);const uiSourceCode=this._files[tabId];this._innerShowFile(uiSourceCode,userGesture);}
_addUISourceCodeListeners(uiSourceCode){uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);}
_removeUISourceCodeListeners(uiSourceCode){uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged,this._uiSourceCodeTitleChanged,this);uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,this._uiSourceCodeWorkingCopyChanged,this);uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,this._uiSourceCodeWorkingCopyCommitted,this);}
_updateFileTitle(uiSourceCode){const tabId=this._tabIds.get(uiSourceCode);if(tabId){const title=this._titleForFile(uiSourceCode);this._tabbedPane.changeTabTitle(tabId,title);let icon=null;if(Persistence.persistence.hasUnsavedCommittedChanges(uiSourceCode)){icon=UI.Icon.create('smallicon-warning');icon.title=Common.UIString('Changes to this file were not saved to file system.');}else{icon=Persistence.PersistenceUtils.iconForUISourceCode(uiSourceCode);}
this._tabbedPane.setTabIcon(tabId,icon);}}
_uiSourceCodeTitleChanged(event){const uiSourceCode=(event.data);this._updateFileTitle(uiSourceCode);this._updateHistory();}
_uiSourceCodeWorkingCopyChanged(event){const uiSourceCode=(event.data);this._updateFileTitle(uiSourceCode);}
_uiSourceCodeWorkingCopyCommitted(event){const uiSourceCode=(event.data.uiSourceCode);this._updateFileTitle(uiSourceCode);}
_generateTabId(){return'tab_'+(Sources.TabbedEditorContainer._tabId++);}
currentFile(){return this._currentFile||null;}};Sources.TabbedEditorContainer.Events={EditorSelected:Symbol('EditorSelected'),EditorClosed:Symbol('EditorClosed')};Sources.TabbedEditorContainer._tabId=0;Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount=30;Sources.TabbedEditorContainer.HistoryItem=class{constructor(url,selectionRange,scrollLineNumber){this.url=url;this._isSerializable=url.length<Sources.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit;this.selectionRange=selectionRange;this.scrollLineNumber=scrollLineNumber;}
static fromObject(serializedHistoryItem){const selectionRange=serializedHistoryItem.selectionRange?TextUtils.TextRange.fromObject(serializedHistoryItem.selectionRange):undefined;return new Sources.TabbedEditorContainer.HistoryItem(serializedHistoryItem.url,selectionRange,serializedHistoryItem.scrollLineNumber);}
serializeToObject(){if(!this._isSerializable)
return null;const serializedHistoryItem={};serializedHistoryItem.url=this.url;serializedHistoryItem.selectionRange=this.selectionRange;serializedHistoryItem.scrollLineNumber=this.scrollLineNumber;return serializedHistoryItem;}};Sources.TabbedEditorContainer.HistoryItem.serializableUrlLengthLimit=4096;Sources.TabbedEditorContainer.History=class{constructor(items){this._items=items;this._rebuildItemIndex();}
static fromObject(serializedHistory){const items=[];for(let i=0;i<serializedHistory.length;++i)
items.push(Sources.TabbedEditorContainer.HistoryItem.fromObject(serializedHistory[i]));return new Sources.TabbedEditorContainer.History(items);}
index(url){return this._itemsIndex.has(url)?(this._itemsIndex.get(url)):-1;}
_rebuildItemIndex(){this._itemsIndex=new Map();for(let i=0;i<this._items.length;++i){console.assert(!this._itemsIndex.has(this._items[i].url));this._itemsIndex.set(this._items[i].url,i);}}
selectionRange(url){const index=this.index(url);return index!==-1?this._items[index].selectionRange:undefined;}
updateSelectionRange(url,selectionRange){if(!selectionRange)
return;const index=this.index(url);if(index===-1)
return;this._items[index].selectionRange=selectionRange;}
scrollLineNumber(url){const index=this.index(url);return index!==-1?this._items[index].scrollLineNumber:undefined;}
updateScrollLineNumber(url,scrollLineNumber){const index=this.index(url);if(index===-1)
return;this._items[index].scrollLineNumber=scrollLineNumber;}
update(urls){for(let i=urls.length-1;i>=0;--i){const index=this.index(urls[i]);let item;if(index!==-1){item=this._items[index];this._items.splice(index,1);}else{item=new Sources.TabbedEditorContainer.HistoryItem(urls[i]);}
this._items.unshift(item);this._rebuildItemIndex();}}
remove(url){const index=this.index(url);if(index!==-1){this._items.splice(index,1);this._rebuildItemIndex();}}
save(setting){setting.set(this._serializeToObject());}
_serializeToObject(){const serializedHistory=[];for(let i=0;i<this._items.length;++i){const serializedItem=this._items[i].serializeToObject();if(serializedItem)
serializedHistory.push(serializedItem);if(serializedHistory.length===Sources.TabbedEditorContainer.maximalPreviouslyViewedFilesCount)
break;}
return serializedHistory;}
_urls(){const result=[];for(let i=0;i<this._items.length;++i)
result.push(this._items[i].url);return result;}};Sources.EditorContainerTabDelegate=class{constructor(editorContainer){this._editorContainer=editorContainer;}
closeTabs(tabbedPane,ids){this._editorContainer._closeTabs(ids);}
onContextMenu(tabId,contextMenu){this._editorContainer._onContextMenu(tabId,contextMenu);}};;Sources.WatchExpressionsSidebarPane=class extends UI.ThrottledWidget{constructor(){super(true);this.registerRequiredCSS('object_ui/objectValue.css');this.registerRequiredCSS('sources/watchExpressionsSidebarPane.css');this._watchExpressions=[];this._watchExpressionsSetting=Common.settings.createLocalSetting('watchExpressions',[]);this._addButton=new UI.ToolbarButton(ls`Add watch expression`,'largeicon-add');this._addButton.addEventListener(UI.ToolbarButton.Events.Click,this._addButtonClicked.bind(this));this._refreshButton=new UI.ToolbarButton(ls`Refresh watch expressions`,'largeicon-refresh');this._refreshButton.addEventListener(UI.ToolbarButton.Events.Click,this.update,this);this.contentElement.classList.add('watch-expressions');this.contentElement.addEventListener('contextmenu',this._contextMenu.bind(this),false);this._expandController=new ObjectUI.ObjectPropertiesSectionExpandController();UI.context.addFlavorChangeListener(SDK.ExecutionContext,this.update,this);UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this.update,this);this._linkifier=new Components.Linkifier();this.update();}
toolbarItems(){return[this._addButton,this._refreshButton];}
hasExpressions(){return!!this._watchExpressionsSetting.get().length;}
_saveExpressions(){const toSave=[];for(let i=0;i<this._watchExpressions.length;i++){if(this._watchExpressions[i].expression())
toSave.push(this._watchExpressions[i].expression());}
this._watchExpressionsSetting.set(toSave);}
async _addButtonClicked(){await UI.viewManager.showView('sources.watch');this._createWatchExpression(null).startEditing();}
doUpdate(){this._linkifier.reset();this.contentElement.removeChildren();this._watchExpressions=[];this._emptyElement=this.contentElement.createChild('div','gray-info-message');this._emptyElement.textContent=Common.UIString('No watch expressions');const watchExpressionStrings=this._watchExpressionsSetting.get();for(let i=0;i<watchExpressionStrings.length;++i){const expression=watchExpressionStrings[i];if(!expression)
continue;this._createWatchExpression(expression);}
return Promise.resolve();}
_createWatchExpression(expression){this._emptyElement.classList.add('hidden');const watchExpression=new Sources.WatchExpression(expression,this._expandController,this._linkifier);watchExpression.addEventListener(Sources.WatchExpression.Events.ExpressionUpdated,this._watchExpressionUpdated,this);this.contentElement.appendChild(watchExpression.element());this._watchExpressions.push(watchExpression);return watchExpression;}
_watchExpressionUpdated(event){const watchExpression=(event.data);if(!watchExpression.expression()){this._watchExpressions.remove(watchExpression);this.contentElement.removeChild(watchExpression.element());this._emptyElement.classList.toggle('hidden',!!this._watchExpressions.length);}
this._saveExpressions();}
_contextMenu(event){const contextMenu=new UI.ContextMenu(event);this._populateContextMenu(contextMenu,event);contextMenu.show();}
_populateContextMenu(contextMenu,event){let isEditing=false;for(const watchExpression of this._watchExpressions)
isEditing|=watchExpression.isEditing();if(!isEditing)
contextMenu.debugSection().appendItem(Common.UIString('Add watch expression'),this._addButtonClicked.bind(this));if(this._watchExpressions.length>1){contextMenu.debugSection().appendItem(Common.UIString('Delete all watch expressions'),this._deleteAllButtonClicked.bind(this));}
const target=event.deepElementFromPoint();if(!target)
return;for(const watchExpression of this._watchExpressions){if(watchExpression.element().isSelfOrAncestor(target))
watchExpression._populateContextMenu(contextMenu,event);}}
_deleteAllButtonClicked(){this._watchExpressions=[];this._saveExpressions();this.update();}
_focusAndAddExpressionToWatch(expression){UI.viewManager.showView('sources.watch');this.doUpdate();this._addExpressionToWatch(expression);}
_addExpressionToWatch(expression){this._createWatchExpression(expression);this._saveExpressions();}
handleAction(context,actionId){const frame=UI.context.flavor(Sources.UISourceCodeFrame);if(!frame)
return false;const text=frame.textEditor.text(frame.textEditor.selection());this._focusAndAddExpressionToWatch(text);return true;}
_addPropertyPathToWatch(target){this._addExpressionToWatch(target.path());}
appendApplicableItems(event,contextMenu,target){if(target instanceof ObjectUI.ObjectPropertyTreeElement&&!target.property.synthetic){contextMenu.debugSection().appendItem(ls`Add property path to watch`,this._addPropertyPathToWatch.bind(this,target));}
const frame=UI.context.flavor(Sources.UISourceCodeFrame);if(!frame||frame.textEditor.selection().isEmpty())
return;contextMenu.debugSection().appendAction('sources.add-to-watch');}};Sources.WatchExpression=class extends Common.Object{constructor(expression,expandController,linkifier){super();this._expression=expression;this._expandController=expandController;this._element=createElementWithClass('div','watch-expression monospace');this._editing=false;this._linkifier=linkifier;this._createWatchExpression();this.update();}
element(){return this._element;}
expression(){return this._expression;}
update(){const currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(currentExecutionContext&&this._expression){currentExecutionContext.evaluate({expression:this._expression,objectGroup:Sources.WatchExpression._watchObjectGroupId,includeCommandLineAPI:false,silent:true,returnByValue:false,generatePreview:false},false,false).then(result=>this._createWatchExpression(result.object,result.exceptionDetails));}}
startEditing(){this._editing=true;this._element.removeChild(this._objectPresentationElement);const newDiv=this._element.createChild('div');newDiv.textContent=this._nameElement.textContent;this._textPrompt=new ObjectUI.ObjectPropertyPrompt();this._textPrompt.renderAsBlock();const proxyElement=this._textPrompt.attachAndStartEditing(newDiv,this._finishEditing.bind(this));proxyElement.classList.add('watch-expression-text-prompt-proxy');proxyElement.addEventListener('keydown',this._promptKeyDown.bind(this),false);this._element.getComponentSelection().selectAllChildren(newDiv);}
isEditing(){return!!this._editing;}
_finishEditing(event,canceled){if(event)
event.consume(canceled);this._editing=false;this._textPrompt.detach();const newExpression=canceled?this._expression:this._textPrompt.text();delete this._textPrompt;this._element.removeChildren();this._element.appendChild(this._objectPresentationElement);this._updateExpression(newExpression);}
_dblClickOnWatchExpression(event){event.consume();if(!this.isEditing())
this.startEditing();}
_updateExpression(newExpression){if(this._expression)
this._expandController.stopWatchSectionsWithId(this._expression);this._expression=newExpression;this.update();this.dispatchEventToListeners(Sources.WatchExpression.Events.ExpressionUpdated,this);}
_deleteWatchExpression(event){event.consume(true);this._updateExpression(null);}
_createWatchExpression(result,exceptionDetails){this._result=result||null;const headerElement=createElementWithClass('div','watch-expression-header');const deleteButton=UI.Icon.create('smallicon-cross','watch-expression-delete-button');deleteButton.title=ls`Delete watch expression`;deleteButton.addEventListener('click',this._deleteWatchExpression.bind(this),false);headerElement.appendChild(deleteButton);const titleElement=headerElement.createChild('div','watch-expression-title');this._nameElement=ObjectUI.ObjectPropertiesSection.createNameElement(this._expression);if(!!exceptionDetails||!result){this._valueElement=createElementWithClass('span','watch-expression-error value');titleElement.classList.add('dimmed');this._valueElement.textContent=Common.UIString('<not available>');}else{this._valueElement=ObjectUI.ObjectPropertiesSection.createValueElementWithCustomSupport(result,!!exceptionDetails,false,titleElement,this._linkifier);}
const separatorElement=createElementWithClass('span','watch-expressions-separator');separatorElement.textContent=': ';titleElement.appendChildren(this._nameElement,separatorElement,this._valueElement);this._element.removeChildren();this._objectPropertiesSection=null;if(!exceptionDetails&&result&&result.hasChildren&&!result.customPreview()){headerElement.classList.add('watch-expression-object-header');this._objectPropertiesSection=new ObjectUI.ObjectPropertiesSection(result,headerElement,this._linkifier);this._objectPresentationElement=this._objectPropertiesSection.element;this._objectPresentationElement.classList.add('watch-expression-object');this._expandController.watchSection((this._expression),this._objectPropertiesSection);const objectTreeElement=this._objectPropertiesSection.objectTreeElement();objectTreeElement.toggleOnClick=false;objectTreeElement.listItemElement.addEventListener('click',this._onSectionClick.bind(this),false);objectTreeElement.listItemElement.addEventListener('dblclick',this._dblClickOnWatchExpression.bind(this));}else{this._objectPresentationElement=headerElement;this._objectPresentationElement.addEventListener('dblclick',this._dblClickOnWatchExpression.bind(this));}
this._element.appendChild(this._objectPresentationElement);}
_onSectionClick(event){event.consume(true);if(event.detail===1){this._preventClickTimeout=setTimeout(handleClick.bind(this),333);}else{clearTimeout(this._preventClickTimeout);delete this._preventClickTimeout;}
function handleClick(){if(!this._objectPropertiesSection)
return;const objectTreeElement=this._objectPropertiesSection.objectTreeElement();if(objectTreeElement.expanded)
objectTreeElement.collapse();else
objectTreeElement.expand();}}
_promptKeyDown(event){if(isEnterKey(event)||isEscKey(event))
this._finishEditing(event,isEscKey(event));}
_populateContextMenu(contextMenu,event){if(!this.isEditing()){contextMenu.editSection().appendItem(Common.UIString('Delete watch expression'),this._updateExpression.bind(this,null));}
if(!this.isEditing()&&this._result&&(this._result.type==='number'||this._result.type==='string'))
contextMenu.clipboardSection().appendItem(Common.UIString('Copy value'),this._copyValueButtonClicked.bind(this));const target=event.deepElementFromPoint();if(target&&this._valueElement.isSelfOrAncestor(target))
contextMenu.appendApplicableItems(this._result);}
_copyValueButtonClicked(){InspectorFrontendHost.copyText(this._valueElement.textContent);}};Sources.WatchExpression._watchObjectGroupId='watch-group';Sources.WatchExpression.Events={ExpressionUpdated:Symbol('ExpressionUpdated')};;Sources.ThreadsSidebarPane=class extends UI.VBox{constructor(){super(true);this.registerRequiredCSS('sources/threadsSidebarPane.css');this._items=new UI.ListModel();this._list=new UI.ListControl(this._items,this,UI.ListMode.NonViewport);this.contentElement.appendChild(this._list.element);UI.context.addFlavorChangeListener(SDK.Target,this._targetFlavorChanged,this);SDK.targetManager.observeModels(SDK.DebuggerModel,this);}
static shouldBeShown(){return SDK.targetManager.models(SDK.DebuggerModel).length>=2;}
createElementForItem(debuggerModel){const element=createElementWithClass('div','thread-item');const title=element.createChild('div','thread-item-title');const pausedState=element.createChild('div','thread-item-paused-state');element.appendChild(UI.Icon.create('smallicon-thick-right-arrow','selected-thread-icon'));function updateTitle(){const executionContext=debuggerModel.runtimeModel().defaultExecutionContext();title.textContent=executionContext&&executionContext.label()?executionContext.label():debuggerModel.target().name();}
function updatePausedState(){pausedState.textContent=debuggerModel.isPaused()?ls`paused`:'';}
function targetNameChanged(event){const target=(event.data);if(target===debuggerModel.target())
updateTitle();}
debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused,updatePausedState);debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerResumed,updatePausedState);debuggerModel.runtimeModel().addEventListener(SDK.RuntimeModel.Events.ExecutionContextChanged,updateTitle);SDK.targetManager.addEventListener(SDK.TargetManager.Events.NameChanged,targetNameChanged);updatePausedState();updateTitle();return element;}
heightForItem(debuggerModel){console.assert(false);return 0;}
isItemSelectable(debuggerModel){return true;}
selectedItemChanged(from,to,fromElement,toElement){if(fromElement)
fromElement.classList.remove('selected');if(toElement)
toElement.classList.add('selected');if(to)
UI.context.setFlavor(SDK.Target,to.target());}
modelAdded(debuggerModel){this._items.insert(this._items.length,debuggerModel);const currentTarget=UI.context.flavor(SDK.Target);if(currentTarget===debuggerModel.target())
this._list.selectItem(debuggerModel);}
modelRemoved(debuggerModel){this._items.remove(this._items.indexOf(debuggerModel));}
_targetFlavorChanged(event){const target=(event.data);const debuggerModel=target.model(SDK.DebuggerModel);if(debuggerModel)
this._list.selectItem(debuggerModel);}};;Sources.ScriptFormatterEditorAction=class{constructor(){this._pathsToFormatOnLoad=new Set();}
_editorSelected(event){const uiSourceCode=(event.data);this._updateButton(uiSourceCode);if(this._isFormatableScript(uiSourceCode)&&this._pathsToFormatOnLoad.has(uiSourceCode.url())&&!Sources.sourceFormatter.hasFormatted(uiSourceCode))
this._showFormatted(uiSourceCode);}
_editorClosed(event){const uiSourceCode=(event.data.uiSourceCode);const wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);const original=Sources.sourceFormatter.discardFormattedUISourceCode(uiSourceCode);if(original)
this._pathsToFormatOnLoad.delete(original.url());}
_updateButton(uiSourceCode){this._button.element.classList.toggle('hidden',!this._isFormatableScript(uiSourceCode));}
button(sourcesView){if(this._button)
return this._button;this._sourcesView=sourcesView;this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new UI.ToolbarButton(Common.UIString('Pretty print'),'largeicon-pretty-print');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._toggleFormatScriptSource,this);this._updateButton(sourcesView.currentUISourceCode());return this._button;}
_isFormatableScript(uiSourceCode){if(!uiSourceCode)
return false;if(uiSourceCode.project().canSetFileContent())
return false;if(uiSourceCode.project().type()===Workspace.projectTypes.Formatter)
return false;if(Persistence.persistence.binding(uiSourceCode))
return false;return uiSourceCode.contentType().hasScripts();}
_toggleFormatScriptSource(event){const uiSourceCode=this._sourcesView.currentUISourceCode();if(!this._isFormatableScript(uiSourceCode))
return;this._pathsToFormatOnLoad.add(uiSourceCode.url());this._showFormatted(uiSourceCode);}
async _showFormatted(uiSourceCode){const formatData=await Sources.sourceFormatter.format(uiSourceCode);if(uiSourceCode!==this._sourcesView.currentUISourceCode())
return;const sourceFrame=this._sourcesView.viewForFile(uiSourceCode);let start=[0,0];if(sourceFrame){const selection=sourceFrame.selection();start=formatData.mapping.originalToFormatted(selection.startLine,selection.startColumn);}
this._sourcesView.showSourceLocation(formatData.formattedSourceCode,start[0],start[1]);}};;Sources.InplaceFormatterEditorAction=class{_editorSelected(event){const uiSourceCode=(event.data);this._updateButton(uiSourceCode);}
_editorClosed(event){const wasSelected=(event.data.wasSelected);if(wasSelected)
this._updateButton(null);}
_updateButton(uiSourceCode){this._button.element.classList.toggle('hidden',!this._isFormattable(uiSourceCode));}
button(sourcesView){if(this._button)
return this._button;this._sourcesView=sourcesView;this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed,this._editorClosed.bind(this));this._button=new UI.ToolbarButton(Common.UIString('Format'),'largeicon-pretty-print');this._button.addEventListener(UI.ToolbarButton.Events.Click,this._formatSourceInPlace,this);this._updateButton(sourcesView.currentUISourceCode());return this._button;}
_isFormattable(uiSourceCode){if(!uiSourceCode)
return false;if(uiSourceCode.project().canSetFileContent())
return true;if(Persistence.persistence.binding(uiSourceCode))
return true;return uiSourceCode.contentType().isStyleSheet();}
_formatSourceInPlace(event){const uiSourceCode=this._sourcesView.currentUISourceCode();if(!this._isFormattable(uiSourceCode))
return;if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode.workingCopy());else
uiSourceCode.requestContent().then(contentLoaded.bind(this));function contentLoaded(content){const highlighterType=uiSourceCode.mimeType();Formatter.Formatter.format(uiSourceCode.contentType(),highlighterType,content||'',innerCallback.bind(this));}
function innerCallback(formattedContent,formatterMapping){if(uiSourceCode.workingCopy()===formattedContent)
return;const sourceFrame=this._sourcesView.viewForFile(uiSourceCode);let start=[0,0];if(sourceFrame){const selection=sourceFrame.selection();start=formatterMapping.originalToFormatted(selection.startLine,selection.startColumn);}
uiSourceCode.setWorkingCopy(formattedContent);this._sourcesView.showSourceLocation(uiSourceCode,start[0],start[1]);}}};;Sources.SourceFormatData=class{constructor(originalSourceCode,formattedSourceCode,mapping){this.originalSourceCode=originalSourceCode;this.formattedSourceCode=formattedSourceCode;this.mapping=mapping;}
originalPath(){return this.originalSourceCode.project().id()+':'+this.originalSourceCode.url();}
static _for(object){return object[Sources.SourceFormatData._formatDataSymbol];}};Sources.SourceFormatData._formatDataSymbol=Symbol('formatData');Sources.SourceFormatter=class{constructor(){this._projectId='formatter:';this._project=new Bindings.ContentProviderBasedProject(Workspace.workspace,this._projectId,Workspace.projectTypes.Formatter,'formatter',true);this._formattedSourceCodes=new Map();this._scriptMapping=new Sources.SourceFormatter.ScriptMapping();this._styleMapping=new Sources.SourceFormatter.StyleMapping();Workspace.workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._onUISourceCodeRemoved,this);}
_onUISourceCodeRemoved(event){const uiSourceCode=(event.data);const cacheEntry=this._formattedSourceCodes.get(uiSourceCode);if(cacheEntry&&cacheEntry.formatData)
this._discardFormatData(cacheEntry.formatData);this._formattedSourceCodes.remove(uiSourceCode);}
discardFormattedUISourceCode(formattedUISourceCode){const formatData=Sources.SourceFormatData._for(formattedUISourceCode);if(!formatData)
return null;this._discardFormatData(formatData);this._formattedSourceCodes.remove(formatData.originalSourceCode);return formatData.originalSourceCode;}
_discardFormatData(formatData){delete formatData.formattedSourceCode[Sources.SourceFormatData._formatDataSymbol];this._scriptMapping._setSourceMappingEnabled(formatData,false);this._styleMapping._setSourceMappingEnabled(formatData,false);this._project.removeFile(formatData.formattedSourceCode.url());}
hasFormatted(uiSourceCode){return this._formattedSourceCodes.has(uiSourceCode);}
async format(uiSourceCode){const cacheEntry=this._formattedSourceCodes.get(uiSourceCode);if(cacheEntry)
return cacheEntry.promise;let fulfillFormatPromise;const resultPromise=new Promise(fulfill=>{fulfillFormatPromise=fulfill;});this._formattedSourceCodes.set(uiSourceCode,{promise:resultPromise,formatData:null});const content=await uiSourceCode.requestContent();Formatter.Formatter.format(uiSourceCode.contentType(),uiSourceCode.mimeType(),content||'',formatDone.bind(this));return resultPromise;function formatDone(formattedContent,formatterMapping){const cacheEntry=this._formattedSourceCodes.get(uiSourceCode);if(!cacheEntry||cacheEntry.promise!==resultPromise)
return;let formattedURL;let count=0;let suffix='';do{formattedURL=`${uiSourceCode.url()}:formatted${suffix}`;suffix=`:${count++}`;}while(this._project.uiSourceCodeForURL(formattedURL));const contentProvider=Common.StaticContentProvider.fromString(formattedURL,uiSourceCode.contentType(),formattedContent);const formattedUISourceCode=this._project.addContentProvider(formattedURL,contentProvider,uiSourceCode.mimeType());const formatData=new Sources.SourceFormatData(uiSourceCode,formattedUISourceCode,formatterMapping);formattedUISourceCode[Sources.SourceFormatData._formatDataSymbol]=formatData;this._scriptMapping._setSourceMappingEnabled(formatData,true);this._styleMapping._setSourceMappingEnabled(formatData,true);cacheEntry.formatData=formatData;for(const decoration of uiSourceCode.allDecorations()){const range=decoration.range();const startLocation=formatterMapping.originalToFormatted(range.startLine,range.startColumn);const endLocation=formatterMapping.originalToFormatted(range.endLine,range.endColumn);formattedUISourceCode.addDecoration(new TextUtils.TextRange(startLocation[0],startLocation[1],endLocation[0],endLocation[1]),(decoration.type()),decoration.data());}
fulfillFormatPromise(formatData);}}};Sources.SourceFormatter.ScriptMapping=class{constructor(){Bindings.debuggerWorkspaceBinding.addSourceMapping(this);}
rawLocationToUILocation(rawLocation){const script=rawLocation.script();const formatData=script&&Sources.SourceFormatData._for(script);if(!formatData)
return null;const lineNumber=rawLocation.lineNumber;const columnNumber=rawLocation.columnNumber||0;const formattedLocation=formatData.mapping.originalToFormatted(lineNumber,columnNumber);return formatData.formattedSourceCode.uiLocation(formattedLocation[0],formattedLocation[1]);}
uiLocationToRawLocations(uiSourceCode,lineNumber,columnNumber){const formatData=Sources.SourceFormatData._for(uiSourceCode);if(!formatData)
return[];const originalLocation=formatData.mapping.formattedToOriginal(lineNumber,columnNumber);const scripts=this._scriptsForUISourceCode(formatData.originalSourceCode);if(!scripts.length)
return[];return scripts.map(script=>script.debuggerModel.createRawLocation(script,originalLocation[0],originalLocation[1]));}
_setSourceMappingEnabled(formatData,enabled){const scripts=this._scriptsForUISourceCode(formatData.originalSourceCode);if(!scripts.length)
return;if(enabled){for(const script of scripts)
script[Sources.SourceFormatData._formatDataSymbol]=formatData;}else{for(const script of scripts)
delete script[Sources.SourceFormatData._formatDataSymbol];}
for(const script of scripts)
Bindings.debuggerWorkspaceBinding.updateLocations(script);}
_scriptsForUISourceCode(uiSourceCode){if(uiSourceCode.contentType()===Common.resourceTypes.Document){const target=Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);const debuggerModel=target&&target.model(SDK.DebuggerModel);if(debuggerModel){const scripts=debuggerModel.scriptsForSourceURL(uiSourceCode.url()).filter(script=>script.isInlineScript()&&!script.hasSourceURL);return scripts;}}
if(uiSourceCode.contentType().isScript()){const rawLocations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode,0,0);return rawLocations.map(location=>location.script());}
return[];}};Sources.SourceFormatter.StyleMapping=class{constructor(){Bindings.cssWorkspaceBinding.addSourceMapping(this);this._headersSymbol=Symbol('Sources.SourceFormatter.StyleMapping._headersSymbol');}
rawLocationToUILocation(rawLocation){const styleHeader=rawLocation.header();const formatData=styleHeader&&Sources.SourceFormatData._for(styleHeader);if(!formatData)
return null;const formattedLocation=formatData.mapping.originalToFormatted(rawLocation.lineNumber,rawLocation.columnNumber||0);return formatData.formattedSourceCode.uiLocation(formattedLocation[0],formattedLocation[1]);}
uiLocationToRawLocations(uiLocation){const formatData=Sources.SourceFormatData._for(uiLocation.uiSourceCode);if(!formatData)
return[];const originalLocation=formatData.mapping.formattedToOriginal(uiLocation.lineNumber,uiLocation.columnNumber);const headers=formatData.originalSourceCode[this._headersSymbol];return headers.map(header=>new SDK.CSSLocation(header,originalLocation[0],originalLocation[1]));}
_setSourceMappingEnabled(formatData,enable){const original=formatData.originalSourceCode;const rawLocations=Bindings.cssWorkspaceBinding.uiLocationToRawLocations(original.uiLocation(0,0));const headers=rawLocations.map(rawLocation=>rawLocation.header()).filter(header=>!!header);if(!headers.length)
return;if(enable){original[this._headersSymbol]=headers;headers.forEach(header=>header[Sources.SourceFormatData._formatDataSymbol]=formatData);}else{original[this._headersSymbol]=null;headers.forEach(header=>delete header[Sources.SourceFormatData._formatDataSymbol]);}
headers.forEach(header=>Bindings.cssWorkspaceBinding.updateLocations(header));}};Sources.sourceFormatter=new Sources.SourceFormatter();;Sources.OpenFileQuickOpen=class extends Sources.FilteredUISourceCodeListProvider{attach(){this.setDefaultScores(Sources.SourcesView.defaultUISourceCodeScores());super.attach();}
uiSourceCodeSelected(uiSourceCode,lineNumber,columnNumber){Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelectFileFromFilePicker);if(!uiSourceCode)
return;if(typeof lineNumber==='number')
Common.Revealer.reveal(uiSourceCode.uiLocation(lineNumber,columnNumber));else
Common.Revealer.reveal(uiSourceCode);}
filterProject(project){return!project.isServiceProject();}
renderAsTwoRows(){return true;}};;Sources.SourcesView=class extends UI.VBox{constructor(){super();this.registerRequiredCSS('sources/sourcesView.css');this.element.id='sources-panel-sources-view';this.setMinimumAndPreferredSizes(88,52,150,100);const workspace=Workspace.workspace;this._searchableView=new UI.SearchableView(this,'sourcesViewSearchConfig');this._searchableView.setMinimalSearchQuerySize(0);this._searchableView.show(this.element);this._sourceViewByUISourceCode=new Map();this._editorContainer=new Sources.TabbedEditorContainer(this,Common.settings.createLocalSetting('previouslyViewedFiles',[]),this._placeholderElement());this._editorContainer.show(this._searchableView.element);this._editorContainer.addEventListener(Sources.TabbedEditorContainer.Events.EditorSelected,this._editorSelected,this);this._editorContainer.addEventListener(Sources.TabbedEditorContainer.Events.EditorClosed,this._editorClosed,this);this._historyManager=new Sources.EditingLocationHistoryManager(this,this.currentSourceFrame.bind(this));this._toolbarContainerElement=this.element.createChild('div','sources-toolbar');if(!Runtime.experiments.isEnabled('sourcesPrettyPrint')){this._toolbarEditorActions=new UI.Toolbar('',this._toolbarContainerElement);self.runtime.allInstances(Sources.SourcesView.EditorAction).then(appendButtonsForExtensions.bind(this));}
function appendButtonsForExtensions(actions){for(let i=0;i<actions.length;++i)
this._toolbarEditorActions.appendToolbarItem(actions[i].button(this));}
this._scriptViewToolbar=new UI.Toolbar('',this._toolbarContainerElement);this._scriptViewToolbar.element.style.flex='auto';this._bottomToolbar=new UI.Toolbar('',this._toolbarContainerElement);this._toolbarChangedListener=null;UI.startBatchUpdate();workspace.uiSourceCodes().forEach(this._addUISourceCode.bind(this));UI.endBatchUpdate();workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded,this._uiSourceCodeAdded,this);workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved,this._uiSourceCodeRemoved,this);workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved,this._projectRemoved.bind(this),this);function handleBeforeUnload(event){if(event.returnValue)
return;let unsavedSourceCodes=[];const projects=Workspace.workspace.projectsForType(Workspace.projectTypes.FileSystem);for(let i=0;i<projects.length;++i){unsavedSourceCodes=unsavedSourceCodes.concat(projects[i].uiSourceCodes().filter(sourceCode=>sourceCode.isDirty()));}
if(!unsavedSourceCodes.length)
return;event.returnValue=Common.UIString('DevTools have unsaved changes that will be permanently lost.');UI.viewManager.showView('sources');for(let i=0;i<unsavedSourceCodes.length;++i)
Common.Revealer.reveal(unsavedSourceCodes[i]);}
if(!window.opener)
window.addEventListener('beforeunload',handleBeforeUnload,true);this._shortcuts={};this.element.addEventListener('keydown',this._handleKeyDown.bind(this),false);}
_placeholderElement(){const shortcuts=[{actionId:'quickOpen.show',description:Common.UIString('Open file')},{actionId:'commandMenu.show',description:Common.UIString('Run command')}];const element=createElementWithClass('span','tabbed-pane-placeholder');for(const shortcut of shortcuts){const shortcutKeyText=UI.shortcutRegistry.shortcutTitleForAction(shortcut.actionId);const row=element.createChild('div','tabbed-pane-placeholder-row');row.createChild('div','tabbed-pane-placeholder-key').textContent=shortcutKeyText;row.createChild('div','tabbed-pane-placeholder-value').textContent=shortcut.description;}
element.createChild('div').textContent=Common.UIString('Drop in a folder to add to workspace');element.appendChild(UI.XLink.create('https://developers.9oo91e.qjz9zk/web/tools/chrome-devtools/sources?utm_source=devtools&utm_campaign=2018Q1','Learn more'));return element;}
static defaultUISourceCodeScores(){const defaultScores=new Map();const sourcesView=UI.context.flavor(Sources.SourcesView);if(sourcesView){const uiSourceCodes=sourcesView._editorContainer.historyUISourceCodes();for(let i=1;i<uiSourceCodes.length;++i)
defaultScores.set(uiSourceCodes[i],uiSourceCodes.length-i);}
return defaultScores;}
leftToolbar(){return this._editorContainer.leftToolbar();}
rightToolbar(){return this._editorContainer.rightToolbar();}
bottomToolbar(){return this._bottomToolbar;}
_registerShortcuts(keys,handler){for(let i=0;i<keys.length;++i)
this._shortcuts[keys[i].key]=handler;}
_handleKeyDown(event){const shortcutKey=UI.KeyboardShortcut.makeKeyFromEvent(event);const handler=this._shortcuts[shortcutKey];if(handler&&handler())
event.consume(true);}
wasShown(){super.wasShown();UI.context.setFlavor(Sources.SourcesView,this);}
willHide(){UI.context.setFlavor(Sources.SourcesView,null);super.willHide();}
toolbarContainerElement(){return this._toolbarContainerElement;}
searchableView(){return this._searchableView;}
visibleView(){return this._editorContainer.visibleView;}
currentSourceFrame(){const view=this.visibleView();if(!(view instanceof Sources.UISourceCodeFrame))
return null;return(view);}
currentUISourceCode(){return this._editorContainer.currentFile();}
_onCloseEditorTab(){const uiSourceCode=this._editorContainer.currentFile();if(!uiSourceCode)
return false;this._editorContainer.closeFile(uiSourceCode);return true;}
_onJumpToPreviousLocation(){this._historyManager.rollback();}
_onJumpToNextLocation(){this._historyManager.rollover();}
_uiSourceCodeAdded(event){const uiSourceCode=(event.data);this._addUISourceCode(uiSourceCode);}
_addUISourceCode(uiSourceCode){if(uiSourceCode.project().isServiceProject())
return;if(uiSourceCode.project().type()===Workspace.projectTypes.FileSystem&&Persistence.FileSystemWorkspaceBinding.fileSystemType(uiSourceCode.project())==='overrides')
return;this._editorContainer.addUISourceCode(uiSourceCode);}
_uiSourceCodeRemoved(event){const uiSourceCode=(event.data);this._removeUISourceCodes([uiSourceCode]);}
_removeUISourceCodes(uiSourceCodes){this._editorContainer.removeUISourceCodes(uiSourceCodes);for(let i=0;i<uiSourceCodes.length;++i){this._removeSourceFrame(uiSourceCodes[i]);this._historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);}}
_projectRemoved(event){const project=event.data;const uiSourceCodes=project.uiSourceCodes();this._removeUISourceCodes(uiSourceCodes);}
_updateScriptViewToolbarItems(){this._scriptViewToolbar.removeToolbarItems();const view=this.visibleView();if(view instanceof UI.SimpleView){for(const item of((view)).syncToolbarItems())
this._scriptViewToolbar.appendToolbarItem(item);}}
showSourceLocation(uiSourceCode,lineNumber,columnNumber,omitFocus,omitHighlight){this._historyManager.updateCurrentState();this._editorContainer.showFile(uiSourceCode);const currentSourceFrame=this.currentSourceFrame();if(currentSourceFrame&&typeof lineNumber==='number')
currentSourceFrame.revealPosition(lineNumber,columnNumber,!omitHighlight);this._historyManager.pushNewState();if(!omitFocus)
this.visibleView().focus();}
_createSourceView(uiSourceCode){let sourceFrame;let sourceView;const contentType=uiSourceCode.contentType();if(contentType===Common.resourceTypes.Image)
sourceView=new SourceFrame.ImageView(uiSourceCode.mimeType(),uiSourceCode);else if(contentType===Common.resourceTypes.Font)
sourceView=new SourceFrame.FontView(uiSourceCode.mimeType(),uiSourceCode);else
sourceFrame=new Sources.UISourceCodeFrame(uiSourceCode);if(sourceFrame)
this._historyManager.trackSourceFrameCursorJumps(sourceFrame);const widget=(sourceFrame||sourceView);this._sourceViewByUISourceCode.set(uiSourceCode,widget);return widget;}
_getOrCreateSourceView(uiSourceCode){return this._sourceViewByUISourceCode.get(uiSourceCode)||this._createSourceView(uiSourceCode);}
recycleUISourceCodeFrame(sourceFrame,uiSourceCode){this._sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());sourceFrame.setUISourceCode(uiSourceCode);this._sourceViewByUISourceCode.set(uiSourceCode,sourceFrame);}
viewForFile(uiSourceCode){return this._getOrCreateSourceView(uiSourceCode);}
_removeSourceFrame(uiSourceCode){const sourceView=this._sourceViewByUISourceCode.get(uiSourceCode);this._sourceViewByUISourceCode.remove(uiSourceCode);if(sourceView&&sourceView instanceof Sources.UISourceCodeFrame)
(sourceView).dispose();}
_editorClosed(event){const uiSourceCode=(event.data);this._historyManager.removeHistoryForSourceCode(uiSourceCode);let wasSelected=false;if(!this._editorContainer.currentFile())
wasSelected=true;this._removeToolbarChangedListener();this._updateScriptViewToolbarItems();this._searchableView.resetSearch();const data={};data.uiSourceCode=uiSourceCode;data.wasSelected=wasSelected;this.dispatchEventToListeners(Sources.SourcesView.Events.EditorClosed,data);}
_editorSelected(event){const previousSourceFrame=event.data.previousView instanceof Sources.UISourceCodeFrame?event.data.previousView:null;if(previousSourceFrame)
previousSourceFrame.setSearchableView(null);const currentSourceFrame=event.data.currentView instanceof Sources.UISourceCodeFrame?event.data.currentView:null;if(currentSourceFrame)
currentSourceFrame.setSearchableView(this._searchableView);this._searchableView.setReplaceable(!!currentSourceFrame&&currentSourceFrame.canEditSource());this._searchableView.refreshSearch();this._updateToolbarChangedListener();this._updateScriptViewToolbarItems();this.dispatchEventToListeners(Sources.SourcesView.Events.EditorSelected,this._editorContainer.currentFile());}
_removeToolbarChangedListener(){if(this._toolbarChangedListener)
Common.EventTarget.removeEventListeners([this._toolbarChangedListener]);this._toolbarChangedListener=null;}
_updateToolbarChangedListener(){this._removeToolbarChangedListener();const sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return;this._toolbarChangedListener=sourceFrame.addEventListener(Sources.UISourceCodeFrame.Events.ToolbarItemsChanged,this._updateScriptViewToolbarItems,this);}
searchCanceled(){if(this._searchView)
this._searchView.searchCanceled();delete this._searchView;delete this._searchConfig;}
performSearch(searchConfig,shouldJump,jumpBackwards){const sourceFrame=this.currentSourceFrame();if(!sourceFrame)
return;this._searchView=sourceFrame;this._searchConfig=searchConfig;this._searchView.performSearch(this._searchConfig,shouldJump,jumpBackwards);}
jumpToNextSearchResult(){if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchConfig,true);return;}
this._searchView.jumpToNextSearchResult();}
jumpToPreviousSearchResult(){if(!this._searchView)
return;if(this._searchView!==this.currentSourceFrame()){this.performSearch(this._searchConfig,true);if(this._searchView)
this._searchView.jumpToLastSearchResult();return;}
this._searchView.jumpToPreviousSearchResult();}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}
replaceSelectionWith(searchConfig,replacement){const sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceSelectionWith(searchConfig,replacement);}
replaceAllWith(searchConfig,replacement){const sourceFrame=this.currentSourceFrame();if(!sourceFrame){console.assert(sourceFrame);return;}
sourceFrame.replaceAllWith(searchConfig,replacement);}
_showOutlineQuickOpen(){QuickOpen.QuickOpen.show('@');}
_showGoToLineQuickOpen(){if(this._editorContainer.currentFile())
QuickOpen.QuickOpen.show(':');}
_save(){this._saveSourceFrame(this.currentSourceFrame());}
_saveAll(){const sourceFrames=this._editorContainer.fileViews();sourceFrames.forEach(this._saveSourceFrame.bind(this));}
_saveSourceFrame(sourceFrame){if(!(sourceFrame instanceof Sources.UISourceCodeFrame))
return;const uiSourceCodeFrame=(sourceFrame);uiSourceCodeFrame.commitEditing();}
toggleBreakpointsActiveState(active){this._editorContainer.view.element.classList.toggle('breakpoints-deactivated',!active);}};Sources.SourcesView.Events={EditorClosed:Symbol('EditorClosed'),EditorSelected:Symbol('EditorSelected'),};Sources.SourcesView.EditorAction=function(){};Sources.SourcesView.EditorAction.prototype={button(sourcesView){}};Sources.SourcesView.SwitchFileActionDelegate=class{static _nextFile(currentUISourceCode){function fileNamePrefix(name){const lastDotIndex=name.lastIndexOf('.');const namePrefix=name.substr(0,lastDotIndex!==-1?lastDotIndex:name.length);return namePrefix.toLowerCase();}
const uiSourceCodes=currentUISourceCode.project().uiSourceCodes();const candidates=[];const url=currentUISourceCode.parentURL();const name=currentUISourceCode.name();const namePrefix=fileNamePrefix(name);for(let i=0;i<uiSourceCodes.length;++i){const uiSourceCode=uiSourceCodes[i];if(url!==uiSourceCode.parentURL())
continue;if(fileNamePrefix(uiSourceCode.name())===namePrefix)
candidates.push(uiSourceCode.name());}
candidates.sort(String.naturalOrderComparator);const index=mod(candidates.indexOf(name)+1,candidates.length);const fullURL=(url?url+'/':'')+candidates[index];const nextUISourceCode=currentUISourceCode.project().uiSourceCodeForURL(fullURL);return nextUISourceCode!==currentUISourceCode?nextUISourceCode:null;}
handleAction(context,actionId){const sourcesView=UI.context.flavor(Sources.SourcesView);const currentUISourceCode=sourcesView.currentUISourceCode();if(!currentUISourceCode)
return false;const nextUISourceCode=Sources.SourcesView.SwitchFileActionDelegate._nextFile(currentUISourceCode);if(!nextUISourceCode)
return false;sourcesView.showSourceLocation(nextUISourceCode);return true;}};Sources.SourcesView.ActionDelegate=class{handleAction(context,actionId){const sourcesView=UI.context.flavor(Sources.SourcesView);if(!sourcesView)
return false;switch(actionId){case'sources.close-all':sourcesView._editorContainer.closeAllFiles();return true;case'sources.jump-to-previous-location':sourcesView._onJumpToPreviousLocation();return true;case'sources.jump-to-next-location':sourcesView._onJumpToNextLocation();return true;case'sources.close-editor-tab':return sourcesView._onCloseEditorTab();case'sources.go-to-line':sourcesView._showGoToLineQuickOpen();return true;case'sources.go-to-member':sourcesView._showOutlineQuickOpen();return true;case'sources.save':sourcesView._save();return true;case'sources.save-all':sourcesView._saveAll();return true;}
return false;}};;Sources.SourcesSearchScope=class{constructor(){this._searchId=0;this._searchResultCandidates=[];this._searchResultCallback=null;this._searchFinishedCallback=null;this._searchConfig=null;}
static _filesComparator(uiSourceCode1,uiSourceCode2){if(uiSourceCode1.isDirty()&&!uiSourceCode2.isDirty())
return-1;if(!uiSourceCode1.isDirty()&&uiSourceCode2.isDirty())
return 1;const isFileSystem1=uiSourceCode1.project().type()===Workspace.projectTypes.FileSystem&&!Persistence.persistence.binding(uiSourceCode1);const isFileSystem2=uiSourceCode2.project().type()===Workspace.projectTypes.FileSystem&&!Persistence.persistence.binding(uiSourceCode2);if(isFileSystem1!==isFileSystem2)
return isFileSystem1?1:-1;const url1=uiSourceCode1.url();const url2=uiSourceCode2.url();if(url1&&!url2)
return-1;if(!url1&&url2)
return 1;return String.naturalOrderComparator(uiSourceCode1.fullDisplayName(),uiSourceCode2.fullDisplayName());}
performIndexing(progress){this.stopSearch();const projects=this._projects();const compositeProgress=new Common.CompositeProgress(progress);for(let i=0;i<projects.length;++i){const project=projects[i];const projectProgress=compositeProgress.createSubProgress(project.uiSourceCodes().length);project.indexContent(projectProgress);}}
_projects(){const searchInAnonymousAndContentScripts=Common.moduleSetting('searchInAnonymousAndContentScripts').get();return Workspace.workspace.projects().filter(project=>{if(project.type()===Workspace.projectTypes.Service)
return false;if(!searchInAnonymousAndContentScripts&&project.isServiceProject())
return false;if(!searchInAnonymousAndContentScripts&&project.type()===Workspace.projectTypes.ContentScripts)
return false;return true;});}
performSearch(searchConfig,progress,searchResultCallback,searchFinishedCallback){this.stopSearch();this._searchResultCandidates=[];this._searchResultCallback=searchResultCallback;this._searchFinishedCallback=searchFinishedCallback;this._searchConfig=searchConfig;const promises=[];const compositeProgress=new Common.CompositeProgress(progress);const searchContentProgress=compositeProgress.createSubProgress();const findMatchingFilesProgress=new Common.CompositeProgress(compositeProgress.createSubProgress());for(const project of this._projects()){const weight=project.uiSourceCodes().length;const findMatchingFilesInProjectProgress=findMatchingFilesProgress.createSubProgress(weight);const filesMathingFileQuery=this._projectFilesMatchingFileQuery(project,searchConfig);const promise=project.findFilesMatchingSearchRequest(searchConfig,filesMathingFileQuery,findMatchingFilesInProjectProgress).then(this._processMatchingFilesForProject.bind(this,this._searchId,project,searchConfig,filesMathingFileQuery));promises.push(promise);}
Promise.all(promises).then(this._processMatchingFiles.bind(this,this._searchId,searchContentProgress,this._searchFinishedCallback.bind(this,true)));}
_projectFilesMatchingFileQuery(project,searchConfig,dirtyOnly){const result=[];const uiSourceCodes=project.uiSourceCodes();for(let i=0;i<uiSourceCodes.length;++i){const uiSourceCode=uiSourceCodes[i];if(!uiSourceCode.contentType().isTextType())
continue;const binding=Persistence.persistence.binding(uiSourceCode);if(binding&&binding.network===uiSourceCode)
continue;if(dirtyOnly&&!uiSourceCode.isDirty())
continue;if(searchConfig.filePathMatchesFileQuery(uiSourceCode.fullDisplayName()))
result.push(uiSourceCode.url());}
result.sort(String.naturalOrderComparator);return result;}
_processMatchingFilesForProject(searchId,project,searchConfig,filesMathingFileQuery,files){if(searchId!==this._searchId){this._searchFinishedCallback(false);return;}
files.sort(String.naturalOrderComparator);files=files.intersectOrdered(filesMathingFileQuery,String.naturalOrderComparator);const dirtyFiles=this._projectFilesMatchingFileQuery(project,searchConfig,true);files=files.mergeOrdered(dirtyFiles,String.naturalOrderComparator);const uiSourceCodes=[];for(const file of files){const uiSourceCode=project.uiSourceCodeForURL(file);if(!uiSourceCode)
continue;const script=Bindings.DefaultScriptMapping.scriptForUISourceCode(uiSourceCode);if(script&&!script.isAnonymousScript())
continue;uiSourceCodes.push(uiSourceCode);}
uiSourceCodes.sort(Sources.SourcesSearchScope._filesComparator);this._searchResultCandidates=this._searchResultCandidates.mergeOrdered(uiSourceCodes,Sources.SourcesSearchScope._filesComparator);}
_processMatchingFiles(searchId,progress,callback){if(searchId!==this._searchId){this._searchFinishedCallback(false);return;}
const files=this._searchResultCandidates;if(!files.length){progress.done();callback();return;}
progress.setTotalWork(files.length);let fileIndex=0;const maxFileContentRequests=20;let callbacksLeft=0;for(let i=0;i<maxFileContentRequests&&i<files.length;++i)
scheduleSearchInNextFileOrFinish.call(this);function searchInNextFile(uiSourceCode){if(uiSourceCode.isDirty())
contentLoaded.call(this,uiSourceCode,uiSourceCode.workingCopy());else
uiSourceCode.requestContent().then(contentLoaded.bind(this,uiSourceCode));}
function scheduleSearchInNextFileOrFinish(){if(fileIndex>=files.length){if(!callbacksLeft){progress.done();callback();return;}
return;}
++callbacksLeft;const uiSourceCode=files[fileIndex++];setTimeout(searchInNextFile.bind(this,uiSourceCode),0);}
function contentLoaded(uiSourceCode,content){function matchesComparator(a,b){return a.lineNumber-b.lineNumber;}
progress.worked(1);let matches=[];const queries=this._searchConfig.queries();if(content!==null){for(let i=0;i<queries.length;++i){const nextMatches=Common.ContentProvider.performSearchInContent(content,queries[i],!this._searchConfig.ignoreCase(),this._searchConfig.isRegex());matches=matches.mergeOrdered(nextMatches,matchesComparator);}}
if(matches){const searchResult=new Sources.FileBasedSearchResult(uiSourceCode,matches);this._searchResultCallback(searchResult);}
--callbacksLeft;scheduleSearchInNextFileOrFinish.call(this);}}
stopSearch(){++this._searchId;}};Sources.FileBasedSearchResult=class{constructor(uiSourceCode,searchMatches){this._uiSourceCode=uiSourceCode;this._searchMatches=searchMatches;}
label(){return this._uiSourceCode.displayName();}
description(){return this._uiSourceCode.fullDisplayName();}
matchesCount(){return this._searchMatches.length;}
matchLineContent(index){return this._searchMatches[index].lineContent;}
matchRevealable(index){const match=this._searchMatches[index];return this._uiSourceCode.uiLocation(match.lineNumber,match.columnNumber);}
matchLabel(index){return this._searchMatches[index].lineNumber+1;}};;Sources.SourcesPanel=class extends UI.Panel{constructor(){super('sources');Sources.SourcesPanel._instance=this;this.registerRequiredCSS('sources/sourcesPanel.css');new UI.DropTarget(this.element,[UI.DropTarget.Type.Folder],Common.UIString('Drop workspace folder here'),this._handleDrop.bind(this));this._workspace=Workspace.workspace;this._togglePauseAction=(UI.actionRegistry.action('debugger.toggle-pause'));this._stepOverAction=(UI.actionRegistry.action('debugger.step-over'));this._stepIntoAction=(UI.actionRegistry.action('debugger.step-into'));this._stepOutAction=(UI.actionRegistry.action('debugger.step-out'));this._stepAction=(UI.actionRegistry.action('debugger.step'));this._toggleBreakpointsActiveAction=(UI.actionRegistry.action('debugger.toggle-breakpoints-active'));this._debugToolbar=this._createDebugToolbar();this._debugToolbarDrawer=this._createDebugToolbarDrawer();this._debuggerPausedMessage=new Sources.DebuggerPausedMessage();const initialDebugSidebarWidth=225;this._splitWidget=new UI.SplitWidget(true,true,'sourcesPanelSplitViewState',initialDebugSidebarWidth);this._splitWidget.enableShowModeSaving();this._splitWidget.show(this.element);const initialNavigatorWidth=225;this.editorView=new UI.SplitWidget(true,false,'sourcesPanelNavigatorSplitViewState',initialNavigatorWidth);this.editorView.enableShowModeSaving();this.editorView.element.tabIndex=0;this._splitWidget.setMainWidget(this.editorView);this._navigatorTabbedLocation=UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this),'navigator-view',true);const tabbedPane=this._navigatorTabbedLocation.tabbedPane();tabbedPane.setMinimumSize(100,25);tabbedPane.element.classList.add('navigator-tabbed-pane');const navigatorMenuButton=new UI.ToolbarMenuButton(this._populateNavigatorMenu.bind(this),true);navigatorMenuButton.setTitle(Common.UIString('More options'));tabbedPane.rightToolbar().appendToolbarItem(navigatorMenuButton);if(UI.viewManager.hasViewsForLocation('run-view-sidebar')){const navigatorSplitWidget=new UI.SplitWidget(false,true,'sourcePanelNavigatorSidebarSplitViewState');navigatorSplitWidget.setMainWidget(tabbedPane);const runViewTabbedPane=UI.viewManager.createTabbedLocation(this._revealNavigatorSidebar.bind(this),'run-view-sidebar').tabbedPane();navigatorSplitWidget.setSidebarWidget(runViewTabbedPane);navigatorSplitWidget.installResizer(runViewTabbedPane.headerElement());this.editorView.setSidebarWidget(navigatorSplitWidget);}else{this.editorView.setSidebarWidget(tabbedPane);}
this._sourcesView=new Sources.SourcesView();this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected,this._editorSelected.bind(this));this._toggleNavigatorSidebarButton=this.editorView.createShowHideSidebarButton('navigator');this._toggleDebuggerSidebarButton=this._splitWidget.createShowHideSidebarButton('debugger');this.editorView.setMainWidget(this._sourcesView);this._threadsSidebarPane=null;this._watchSidebarPane=(UI.viewManager.view('sources.watch'));this._callstackPane=self.runtime.sharedInstance(Sources.CallStackSidebarPane);Common.moduleSetting('sidebarPosition').addChangeListener(this._updateSidebarPosition.bind(this));this._updateSidebarPosition();this._updateDebuggerButtonsAndStatus();this._pauseOnExceptionEnabledChanged();Common.moduleSetting('pauseOnExceptionEnabled').addChangeListener(this._pauseOnExceptionEnabledChanged,this);this._liveLocationPool=new Bindings.LiveLocationPool();this._setTarget(UI.context.flavor(SDK.Target));Common.moduleSetting('breakpointsActive').addChangeListener(this._breakpointsActiveStateChanged,this);UI.context.addFlavorChangeListener(SDK.Target,this._onCurrentTargetChanged,this);UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this._callFrameChanged,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerWasEnabled,this._debuggerWasEnabled,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerPaused,this._debuggerPaused,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.DebuggerResumed,event=>this._debuggerResumed((event.data)));SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.GlobalObjectCleared,event=>this._debuggerResumed((event.data)));Extensions.extensionServer.addEventListener(Extensions.ExtensionServer.Events.SidebarPaneAdded,this._extensionSidebarPaneAdded,this);SDK.targetManager.observeTargets(this);}
static instance(){if(Sources.SourcesPanel._instance)
return Sources.SourcesPanel._instance;return(self.runtime.sharedInstance(Sources.SourcesPanel));}
static updateResizerAndSidebarButtons(panel){panel._sourcesView.leftToolbar().removeToolbarItems();panel._sourcesView.rightToolbar().removeToolbarItems();panel._sourcesView.bottomToolbar().removeToolbarItems();const isInWrapper=Sources.SourcesPanel.WrapperView.isShowing()&&!UI.inspectorView.isDrawerMinimized();if(panel._splitWidget.isVertical()||isInWrapper)
panel._splitWidget.uninstallResizer(panel._sourcesView.toolbarContainerElement());else
panel._splitWidget.installResizer(panel._sourcesView.toolbarContainerElement());if(!isInWrapper){panel._sourcesView.leftToolbar().appendToolbarItem(panel._toggleNavigatorSidebarButton);if(panel._splitWidget.isVertical())
panel._sourcesView.rightToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);else
panel._sourcesView.bottomToolbar().appendToolbarItem(panel._toggleDebuggerSidebarButton);}}
targetAdded(target){this._showThreadsIfNeeded();}
targetRemoved(target){}
_showThreadsIfNeeded(){if(Sources.ThreadsSidebarPane.shouldBeShown()&&!this._threadsSidebarPane){this._threadsSidebarPane=(UI.viewManager.view('sources.threads'));if(this._sidebarPaneStack&&this._threadsSidebarPane){this._sidebarPaneStack.showView(this._threadsSidebarPane,this._splitWidget.isVertical()?this._watchSidebarPane:this._callstackPane);}}}
_setTarget(target){if(!target)
return;const debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel)
return;if(debuggerModel.isPaused()){this._showDebuggerPausedDetails((debuggerModel.debuggerPausedDetails()));}else{this._paused=false;this._clearInterface();this._toggleDebuggerSidebarButton.setEnabled(true);}}
_onCurrentTargetChanged(event){const target=(event.data);this._setTarget(target);}
paused(){return this._paused;}
wasShown(){UI.context.setFlavor(Sources.SourcesPanel,this);super.wasShown();const wrapper=Sources.SourcesPanel.WrapperView._instance;if(wrapper&&wrapper.isShowing()){UI.inspectorView.setDrawerMinimized(true);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);}
this.editorView.setMainWidget(this._sourcesView);}
willHide(){super.willHide();UI.context.setFlavor(Sources.SourcesPanel,null);if(Sources.SourcesPanel.WrapperView.isShowing()){Sources.SourcesPanel.WrapperView._instance._showViewInWrapper();UI.inspectorView.setDrawerMinimized(false);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);}}
resolveLocation(locationName){if(locationName==='sources.sidebar-top'||locationName==='sources.sidebar-bottom'||locationName==='sources.sidebar-tabs')
return this._sidebarPaneStack;else
return this._navigatorTabbedLocation;}
_ensureSourcesViewVisible(){if(Sources.SourcesPanel.WrapperView.isShowing())
return true;if(!UI.inspectorView.canSelectPanel('sources'))
return false;UI.viewManager.showView('sources');return true;}
onResize(){if(Common.moduleSetting('sidebarPosition').get()==='auto')
this.element.window().requestAnimationFrame(this._updateSidebarPosition.bind(this));}
searchableView(){return this._sourcesView.searchableView();}
_debuggerPaused(event){const debuggerModel=(event.data);const details=debuggerModel.debuggerPausedDetails();if(!this._paused)
this._setAsCurrentPanel();if(UI.context.flavor(SDK.Target)===debuggerModel.target())
this._showDebuggerPausedDetails((details));else if(!this._paused)
UI.context.setFlavor(SDK.Target,debuggerModel.target());}
_showDebuggerPausedDetails(details){this._paused=true;this._updateDebuggerButtonsAndStatus();UI.context.setFlavor(SDK.DebuggerPausedDetails,details);this._toggleDebuggerSidebarButton.setEnabled(false);this._revealDebuggerSidebar();window.focus();InspectorFrontendHost.bringToFront();}
_debuggerResumed(debuggerModel){const target=debuggerModel.target();if(UI.context.flavor(SDK.Target)!==target)
return;this._paused=false;this._clearInterface();this._toggleDebuggerSidebarButton.setEnabled(true);this._switchToPausedTargetTimeout=setTimeout(this._switchToPausedTarget.bind(this,debuggerModel),500);}
_debuggerWasEnabled(event){const debuggerModel=(event.data);if(UI.context.flavor(SDK.Target)!==debuggerModel.target())
return;this._updateDebuggerButtonsAndStatus();}
get visibleView(){return this._sourcesView.visibleView();}
showUISourceCode(uiSourceCode,lineNumber,columnNumber,omitFocus){if(omitFocus){const wrapperShowing=Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing();if(!this.isShowing()&&!wrapperShowing)
return;}else{this._showEditor();}
this._sourcesView.showSourceLocation(uiSourceCode,lineNumber,columnNumber,omitFocus);}
_showEditor(){if(Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing())
return;this._setAsCurrentPanel();}
showUILocation(uiLocation,omitFocus){this.showUISourceCode(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,omitFocus);}
_revealInNavigator(uiSourceCode,skipReveal){const extensions=self.runtime.extensions(Sources.NavigatorView);Promise.all(extensions.map(extension=>extension.instance())).then(filterNavigators.bind(this));function filterNavigators(objects){for(let i=0;i<objects.length;++i){const navigatorView=(objects[i]);const viewId=extensions[i].descriptor()['viewId'];if(navigatorView.acceptProject(uiSourceCode.project())){navigatorView.revealUISourceCode(uiSourceCode,true);if(skipReveal)
this._navigatorTabbedLocation.tabbedPane().selectTab(viewId);else
UI.viewManager.showView(viewId);}}}}
_populateNavigatorMenu(contextMenu){const groupByFolderSetting=Common.moduleSetting('navigatorGroupByFolder');contextMenu.appendItemsAtLocation('navigatorMenu');contextMenu.viewSection().appendCheckboxItem(Common.UIString('Group by folder'),()=>groupByFolderSetting.set(!groupByFolderSetting.get()),groupByFolderSetting.get());}
setIgnoreExecutionLineEvents(ignoreExecutionLineEvents){this._ignoreExecutionLineEvents=ignoreExecutionLineEvents;}
updateLastModificationTime(){this._lastModificationTime=window.performance.now();}
_executionLineChanged(liveLocation){const uiLocation=liveLocation.uiLocation();if(!uiLocation)
return;if(window.performance.now()-this._lastModificationTime<Sources.SourcesPanel._lastModificationTimeout)
return;this._sourcesView.showSourceLocation(uiLocation.uiSourceCode,uiLocation.lineNumber,uiLocation.columnNumber,undefined,true);}
_lastModificationTimeoutPassedForTest(){Sources.SourcesPanel._lastModificationTimeout=Number.MIN_VALUE;}
_updateLastModificationTimeForTest(){Sources.SourcesPanel._lastModificationTimeout=Number.MAX_VALUE;}
_callFrameChanged(){const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);if(!callFrame)
return;if(this._executionLineLocation)
this._executionLineLocation.dispose();this._executionLineLocation=Bindings.debuggerWorkspaceBinding.createCallFrameLiveLocation(callFrame.location(),this._executionLineChanged.bind(this),this._liveLocationPool);}
_pauseOnExceptionEnabledChanged(){const enabled=Common.moduleSetting('pauseOnExceptionEnabled').get();this._pauseOnExceptionButton.setToggled(enabled);this._pauseOnExceptionButton.setTitle(enabled?ls`Don't pause on exceptions`:ls`Pause on exceptions`);this._debugToolbarDrawer.classList.toggle('expanded',enabled);}
async _updateDebuggerButtonsAndStatus(){const currentTarget=UI.context.flavor(SDK.Target);const currentDebuggerModel=currentTarget?currentTarget.model(SDK.DebuggerModel):null;if(!currentDebuggerModel){this._togglePauseAction.setEnabled(false);this._stepOverAction.setEnabled(false);this._stepIntoAction.setEnabled(false);this._stepOutAction.setEnabled(false);this._stepAction.setEnabled(false);}else if(this._paused){this._togglePauseAction.setToggled(true);this._togglePauseAction.setEnabled(true);this._stepOverAction.setEnabled(true);this._stepIntoAction.setEnabled(true);this._stepOutAction.setEnabled(true);this._stepAction.setEnabled(true);}else{this._togglePauseAction.setToggled(false);this._togglePauseAction.setEnabled(!currentDebuggerModel.isPausing());this._stepOverAction.setEnabled(false);this._stepIntoAction.setEnabled(false);this._stepOutAction.setEnabled(false);this._stepAction.setEnabled(false);}
const details=currentDebuggerModel?currentDebuggerModel.debuggerPausedDetails():null;await this._debuggerPausedMessage.render(details,Bindings.debuggerWorkspaceBinding,Bindings.breakpointManager);if(details)
this._updateDebuggerButtonsAndStatusForTest();}
_updateDebuggerButtonsAndStatusForTest(){}
_clearInterface(){this._updateDebuggerButtonsAndStatus();UI.context.setFlavor(SDK.DebuggerPausedDetails,null);if(this._switchToPausedTargetTimeout)
clearTimeout(this._switchToPausedTargetTimeout);this._liveLocationPool.disposeAll();}
_switchToPausedTarget(debuggerModel){delete this._switchToPausedTargetTimeout;if(this._paused)
return;if(debuggerModel.isPaused())
return;const debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);for(let i=0;i<debuggerModels.length;++i){if(debuggerModels[i].isPaused()){UI.context.setFlavor(SDK.Target,debuggerModels[i].target());break;}}}
_togglePauseOnExceptions(){Common.moduleSetting('pauseOnExceptionEnabled').set(!this._pauseOnExceptionButton.toggled());}
_runSnippet(){const uiSourceCode=this._sourcesView.currentUISourceCode();if(!uiSourceCode)
return;Snippets.evaluateScriptSnippet(uiSourceCode);}
_editorSelected(event){const uiSourceCode=(event.data);if(this.editorView.mainWidget()&&Common.moduleSetting('autoRevealInNavigator').get())
this._revealInNavigator(uiSourceCode,true);}
_togglePause(){const target=UI.context.flavor(SDK.Target);if(!target)
return true;const debuggerModel=target.model(SDK.DebuggerModel);if(!debuggerModel)
return true;if(this._paused){this._paused=false;debuggerModel.resume();}else{debuggerModel.pause();}
this._clearInterface();return true;}
_prepareToResume(){if(!this._paused)
return null;this._paused=false;this._clearInterface();const target=UI.context.flavor(SDK.Target);return target?target.model(SDK.DebuggerModel):null;}
_longResume(event){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return;debuggerModel.skipAllPausesUntilReloadOrTimeout(500);debuggerModel.resume();}
_terminateExecution(event){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return;debuggerModel.runtimeModel().terminateExecution();debuggerModel.resume();}
_stepOver(){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepOver();return true;}
_stepInto(){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepInto();return true;}
_stepIntoAsync(){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.scheduleStepIntoAsync();return true;}
_stepOut(){const debuggerModel=this._prepareToResume();if(!debuggerModel)
return true;debuggerModel.stepOut();return true;}
_continueToLocation(uiLocation){const executionContext=UI.context.flavor(SDK.ExecutionContext);if(!executionContext)
return;const rawLocations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiLocation.uiSourceCode,uiLocation.lineNumber,0);const rawLocation=rawLocations.find(location=>location.debuggerModel===executionContext.debuggerModel);if(!rawLocation)
return;if(!this._prepareToResume())
return;rawLocation.continueToLocation();}
_toggleBreakpointsActive(){Common.moduleSetting('breakpointsActive').set(!Common.moduleSetting('breakpointsActive').get());}
_breakpointsActiveStateChanged(){const active=Common.moduleSetting('breakpointsActive').get();this._toggleBreakpointsActiveAction.setToggled(!active);this._sourcesView.toggleBreakpointsActiveState(active);}
_createDebugToolbar(){const debugToolbar=new UI.Toolbar('scripts-debug-toolbar');const longResumeButton=new UI.ToolbarButton(Common.UIString('Resume with all pauses blocked for 500 ms'),'largeicon-play');longResumeButton.addEventListener(UI.ToolbarButton.Events.Click,this._longResume,this);const terminateExecutionButton=new UI.ToolbarButton(ls`Terminate current JavaScript call`,'largeicon-terminate-execution');terminateExecutionButton.addEventListener(UI.ToolbarButton.Events.Click,this._terminateExecution,this);debugToolbar.appendToolbarItem(UI.Toolbar.createLongPressActionButton(this._togglePauseAction,[terminateExecutionButton,longResumeButton],[]));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOverAction));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepIntoAction));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepOutAction));debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._stepAction));debugToolbar.appendSeparator();debugToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleBreakpointsActiveAction));this._pauseOnExceptionButton=new UI.ToolbarToggle('','largeicon-pause-on-exceptions');this._pauseOnExceptionButton.addEventListener(UI.ToolbarButton.Events.Click,this._togglePauseOnExceptions,this);debugToolbar.appendToolbarItem(this._pauseOnExceptionButton);return debugToolbar;}
_createDebugToolbarDrawer(){const debugToolbarDrawer=createElementWithClass('div','scripts-debug-toolbar-drawer');const label=Common.UIString('Pause on caught exceptions');const setting=Common.moduleSetting('pauseOnCaughtException');debugToolbarDrawer.appendChild(UI.SettingsUI.createSettingCheckbox(label,setting,true));return debugToolbarDrawer;}
appendApplicableItems(event,contextMenu,target){this._appendUISourceCodeItems(event,contextMenu,target);this._appendUISourceCodeFrameItems(event,contextMenu,target);this.appendUILocationItems(contextMenu,target);this._appendRemoteObjectItems(contextMenu,target);this._appendNetworkRequestItems(contextMenu,target);}
_appendUISourceCodeItems(event,contextMenu,target){if(!(target instanceof Workspace.UISourceCode))
return;const uiSourceCode=(target);if(!uiSourceCode.project().isServiceProject()&&!event.target.isSelfOrDescendant(this._navigatorTabbedLocation.widget().element)){contextMenu.revealSection().appendItem(Common.UIString('Reveal in sidebar'),this._handleContextMenuReveal.bind(this,uiSourceCode));}}
_appendUISourceCodeFrameItems(event,contextMenu,target){if(!(target instanceof Sources.UISourceCodeFrame))
return;if(target.uiSourceCode().contentType().isFromSourceMap()||target.textEditor.selection().isEmpty())
return;contextMenu.debugSection().appendAction('debugger.evaluate-selection');}
appendUILocationItems(contextMenu,object){if(!(object instanceof Workspace.UILocation))
return;const uiLocation=(object);const uiSourceCode=uiLocation.uiSourceCode;const contentType=uiSourceCode.contentType();if(contentType.hasScripts()){const target=UI.context.flavor(SDK.Target);const debuggerModel=target?target.model(SDK.DebuggerModel):null;if(debuggerModel&&debuggerModel.isPaused()){contextMenu.debugSection().appendItem(Common.UIString('Continue to here'),this._continueToLocation.bind(this,uiLocation));}
this._callstackPane.appendBlackboxURLContextMenuItems(contextMenu,uiSourceCode);}}
_handleContextMenuReveal(uiSourceCode){this.editorView.showBoth();this._revealInNavigator(uiSourceCode);}
_appendRemoteObjectItems(contextMenu,target){if(!(target instanceof SDK.RemoteObject))
return;const remoteObject=(target);const executionContext=UI.context.flavor(SDK.ExecutionContext);contextMenu.debugSection().appendItem(ls`Store as global variable`,()=>SDK.consoleModel.saveToTempVariable(executionContext,remoteObject));if(remoteObject.type==='function'){contextMenu.debugSection().appendItem(ls`Show function definition`,this._showFunctionDefinition.bind(this,remoteObject));}}
_appendNetworkRequestItems(contextMenu,target){if(!(target instanceof SDK.NetworkRequest))
return;const request=(target);const uiSourceCode=this._workspace.uiSourceCodeForURL(request.url());if(!uiSourceCode)
return;const openText=Common.UIString('Open in Sources panel');contextMenu.revealSection().appendItem(openText,this.showUILocation.bind(this,uiSourceCode.uiLocation(0,0)));}
_showFunctionDefinition(remoteObject){remoteObject.debuggerModel().functionDetailsPromise(remoteObject).then(this._didGetFunctionDetails.bind(this));}
_didGetFunctionDetails(response){if(!response||!response.location)
return;const location=response.location;if(!location)
return;const uiLocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(location);if(uiLocation)
this.showUILocation(uiLocation);}
_revealNavigatorSidebar(){this._setAsCurrentPanel();this.editorView.showBoth(true);}
_revealDebuggerSidebar(){this._setAsCurrentPanel();this._splitWidget.showBoth(true);}
_updateSidebarPosition(){let vertically;const position=Common.moduleSetting('sidebarPosition').get();if(position==='right')
vertically=false;else if(position==='bottom')
vertically=true;else
vertically=UI.inspectorView.element.offsetWidth<680;if(this.sidebarPaneView&&vertically===!this._splitWidget.isVertical())
return;if(this.sidebarPaneView&&this.sidebarPaneView.shouldHideOnDetach())
return;if(this.sidebarPaneView)
this.sidebarPaneView.detach();this._splitWidget.setVertical(!vertically);this._splitWidget.element.classList.toggle('sources-split-view-vertical',vertically);Sources.SourcesPanel.updateResizerAndSidebarButtons(this);const vbox=new UI.VBox();vbox.element.appendChild(this._debugToolbarDrawer);vbox.setMinimumAndPreferredSizes(25,25,Sources.SourcesPanel.minToolbarWidth,100);this._sidebarPaneStack=UI.viewManager.createStackLocation(this._revealDebuggerSidebar.bind(this));this._sidebarPaneStack.widget().element.classList.add('overflow-auto');this._sidebarPaneStack.widget().show(vbox.element);this._sidebarPaneStack.widget().element.appendChild(this._debuggerPausedMessage.element());this._sidebarPaneStack.appendApplicableItems('sources.sidebar-top');vbox.element.appendChild(this._debugToolbar.element);if(this._threadsSidebarPane)
this._sidebarPaneStack.showView(this._threadsSidebarPane);if(!vertically)
this._sidebarPaneStack.appendView(this._watchSidebarPane);this._sidebarPaneStack.showView(this._callstackPane);const jsBreakpoints=(UI.viewManager.view('sources.jsBreakpoints'));const scopeChainView=(UI.viewManager.view('sources.scopeChain'));if(this._tabbedLocationHeader){this._splitWidget.uninstallResizer(this._tabbedLocationHeader);this._tabbedLocationHeader=null;}
if(!vertically){this._sidebarPaneStack.showView(scopeChainView);this._sidebarPaneStack.showView(jsBreakpoints);this._extensionSidebarPanesContainer=this._sidebarPaneStack;this.sidebarPaneView=vbox;this._splitWidget.uninstallResizer(this._debugToolbar.gripElementForResize());}else{const splitWidget=new UI.SplitWidget(true,true,'sourcesPanelDebuggerSidebarSplitViewState',0.5);splitWidget.setMainWidget(vbox);this._sidebarPaneStack.showView(jsBreakpoints);const tabbedLocation=UI.viewManager.createTabbedLocation(this._revealDebuggerSidebar.bind(this));splitWidget.setSidebarWidget(tabbedLocation.tabbedPane());this._tabbedLocationHeader=tabbedLocation.tabbedPane().headerElement();this._splitWidget.installResizer(this._tabbedLocationHeader);this._splitWidget.installResizer(this._debugToolbar.gripElementForResize());tabbedLocation.appendView(scopeChainView);tabbedLocation.appendView(this._watchSidebarPane);tabbedLocation.appendApplicableItems('sources.sidebar-tabs');this._extensionSidebarPanesContainer=tabbedLocation;this.sidebarPaneView=splitWidget;}
this._sidebarPaneStack.appendApplicableItems('sources.sidebar-bottom');const extensionSidebarPanes=Extensions.extensionServer.sidebarPanes();for(let i=0;i<extensionSidebarPanes.length;++i)
this._addExtensionSidebarPane(extensionSidebarPanes[i]);this._splitWidget.setSidebarWidget(this.sidebarPaneView);}
_setAsCurrentPanel(){return UI.viewManager.showView('sources');}
_extensionSidebarPaneAdded(event){const pane=(event.data);this._addExtensionSidebarPane(pane);}
_addExtensionSidebarPane(pane){if(pane.panelName()===this.name)
this._extensionSidebarPanesContainer.appendView(pane);}
sourcesView(){return this._sourcesView;}
_handleDrop(dataTransfer){const items=dataTransfer.items;if(!items.length)
return;const entry=items[0].webkitGetAsEntry();if(!entry.isDirectory)
return;InspectorFrontendHost.upgradeDraggedFileSystemPermissions(entry.filesystem);}};Sources.SourcesPanel._lastModificationTimeout=200;Sources.SourcesPanel.minToolbarWidth=215;Sources.SourcesPanel.UILocationRevealer=class{reveal(uiLocation,omitFocus){if(!(uiLocation instanceof Workspace.UILocation))
return Promise.reject(new Error('Internal error: not a ui location'));Sources.SourcesPanel.instance().showUILocation(uiLocation,omitFocus);return Promise.resolve();}};Sources.SourcesPanel.DebuggerLocationRevealer=class{reveal(rawLocation,omitFocus){if(!(rawLocation instanceof SDK.DebuggerModel.Location))
return Promise.reject(new Error('Internal error: not a debugger location'));const uiLocation=Bindings.debuggerWorkspaceBinding.rawLocationToUILocation(rawLocation);if(!uiLocation)
return Promise.resolve();Sources.SourcesPanel.instance().showUILocation(uiLocation,omitFocus);return Promise.resolve();}};Sources.SourcesPanel.UISourceCodeRevealer=class{reveal(uiSourceCode,omitFocus){if(!(uiSourceCode instanceof Workspace.UISourceCode))
return Promise.reject(new Error('Internal error: not a ui source code'));Sources.SourcesPanel.instance().showUISourceCode(uiSourceCode,undefined,undefined,omitFocus);return Promise.resolve();}};Sources.SourcesPanel.DebuggerPausedDetailsRevealer=class{reveal(object){return Sources.SourcesPanel.instance()._setAsCurrentPanel();}};Sources.SourcesPanel.RevealingActionDelegate=class{handleAction(context,actionId){const panel=Sources.SourcesPanel.instance();if(!panel._ensureSourcesViewVisible())
return false;switch(actionId){case'debugger.toggle-pause':panel._togglePause();return true;}
return false;}};Sources.SourcesPanel.DebuggingActionDelegate=class{handleAction(context,actionId){const panel=Sources.SourcesPanel.instance();switch(actionId){case'debugger.step-over':panel._stepOver();return true;case'debugger.step-into':panel._stepIntoAsync();return true;case'debugger.step':panel._stepInto();return true;case'debugger.step-out':panel._stepOut();return true;case'debugger.run-snippet':panel._runSnippet();return true;case'debugger.toggle-breakpoints-active':panel._toggleBreakpointsActive();return true;case'debugger.evaluate-selection':const frame=UI.context.flavor(Sources.UISourceCodeFrame);if(frame){let text=frame.textEditor.text(frame.textEditor.selection());const executionContext=UI.context.flavor(SDK.ExecutionContext);if(executionContext){const message=SDK.consoleModel.addCommandMessage(executionContext,text);text=ObjectUI.JavaScriptREPL.wrapObjectLiteral(text);SDK.consoleModel.evaluateCommandInConsole(executionContext,message,text,true,false);}}
return true;}
return false;}};Sources.SourcesPanel.WrapperView=class extends UI.VBox{constructor(){super();this.element.classList.add('sources-view-wrapper');Sources.SourcesPanel.WrapperView._instance=this;this._view=Sources.SourcesPanel.instance()._sourcesView;}
static isShowing(){return!!Sources.SourcesPanel.WrapperView._instance&&Sources.SourcesPanel.WrapperView._instance.isShowing();}
wasShown(){if(!Sources.SourcesPanel.instance().isShowing())
this._showViewInWrapper();else
UI.inspectorView.setDrawerMinimized(true);Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance());}
willHide(){UI.inspectorView.setDrawerMinimized(false);setImmediate(()=>Sources.SourcesPanel.updateResizerAndSidebarButtons(Sources.SourcesPanel.instance()));}
_showViewInWrapper(){this._view.show(this.element);}};;Sources.JavaScriptCompilerPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor,uiSourceCode){super();this._textEditor=textEditor;this._uiSourceCode=uiSourceCode;this._compiling=false;this._recompileScheduled=false;this._timeout=null;this._message=null;this._disposed=false;this._textEditor.addEventListener(UI.TextEditor.Events.TextChanged,this._scheduleCompile,this);if(this._uiSourceCode.hasCommits()||this._uiSourceCode.isDirty())
this._scheduleCompile();}
static accepts(uiSourceCode){if(uiSourceCode.extension()==='js')
return true;if(Snippets.isSnippetsUISourceCode(uiSourceCode))
return true;for(const debuggerModel of SDK.targetManager.models(SDK.DebuggerModel)){if(Bindings.debuggerWorkspaceBinding.scriptFile(uiSourceCode,debuggerModel))
return true;}
return false;}
_scheduleCompile(){if(this._compiling){this._recompileScheduled=true;return;}
if(this._timeout)
clearTimeout(this._timeout);this._timeout=setTimeout(this._compile.bind(this),Sources.JavaScriptCompilerPlugin.CompileDelay);}
_findRuntimeModel(){const debuggerModels=SDK.targetManager.models(SDK.DebuggerModel);for(let i=0;i<debuggerModels.length;++i){const scriptFile=Bindings.debuggerWorkspaceBinding.scriptFile(this._uiSourceCode,debuggerModels[i]);if(scriptFile)
return debuggerModels[i].runtimeModel();}
return SDK.targetManager.mainTarget()?SDK.targetManager.mainTarget().model(SDK.RuntimeModel):null;}
async _compile(){const runtimeModel=this._findRuntimeModel();if(!runtimeModel)
return;const currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(!currentExecutionContext)
return;const code=this._textEditor.text();if(code.length>1024*100)
return;this._compiling=true;const result=await runtimeModel.compileScript(code,'',false,currentExecutionContext.id);this._compiling=false;if(this._recompileScheduled){this._recompileScheduled=false;this._scheduleCompile();return;}
if(this._message)
this._uiSourceCode.removeMessage(this._message);if(this._disposed||!result||!result.exceptionDetails)
return;const exceptionDetails=result.exceptionDetails;const text=SDK.RuntimeModel.simpleTextFromException(exceptionDetails);this._message=this._uiSourceCode.addLineMessage(Workspace.UISourceCode.Message.Level.Error,text,exceptionDetails.lineNumber,exceptionDetails.columnNumber);this._compilationFinishedForTest();}
_compilationFinishedForTest(){}
dispose(){this._textEditor.removeEventListener(UI.TextEditor.Events.TextChanged,this._scheduleCompile,this);if(this._message)
this._uiSourceCode.removeMessage(this._message);this._disposed=true;if(this._timeout)
clearTimeout(this._timeout);}};Sources.JavaScriptCompilerPlugin.CompileDelay=1000;;Sources.SnippetsPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor,uiSourceCode){super();this._textEditor=textEditor;this._uiSourceCode=uiSourceCode;}
static accepts(uiSourceCode){return Snippets.isSnippetsUISourceCode(uiSourceCode);}
rightToolbarItems(){const runSnippet=UI.Toolbar.createActionButtonForId('debugger.run-snippet');runSnippet.setText(Host.isMac()?Common.UIString('\u2318+Enter'):Common.UIString('Ctrl+Enter'));return[runSnippet];}};;Sources.ScriptOriginPlugin=class extends Sources.UISourceCodeFrame.Plugin{constructor(textEditor,uiSourceCode){super();this._textEditor=textEditor;this._uiSourceCode=uiSourceCode;}
static accepts(uiSourceCode){return uiSourceCode.contentType().hasScripts()||!!Sources.ScriptOriginPlugin._script(uiSourceCode);}
rightToolbarItems(){const originURL=Bindings.CompilerScriptMapping.uiSourceCodeOrigin(this._uiSourceCode);if(originURL){const item=UI.formatLocalized('(source mapped from %s)',[Components.Linkifier.linkifyURL(originURL)]);return[new UI.ToolbarItem(item)];}
const script=Sources.ScriptOriginPlugin._script(this._uiSourceCode);if(!script||!script.originStackTrace)
return[];const link=Sources.ScriptOriginPlugin._linkifier.linkifyStackTraceTopFrame(script.debuggerModel.target(),script.originStackTrace);return[new UI.ToolbarItem(link)];}
static _script(uiSourceCode){const locations=Bindings.debuggerWorkspaceBinding.uiLocationToRawLocations(uiSourceCode,0,0);for(const location of locations){const script=location.script();if(script.originStackTrace)
return script;}
return null;}};Sources.ScriptOriginPlugin._linkifier=new Components.Linkifier();;Runtime.cachedResources["sources/breakpointEditDialog.css"]="/*\n * Copyright 2018 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n  z-index: 30;\n  padding: 4px;\n  background-color: #e6e6e6;\n  border-radius: 7px;\n  border: 2px solid #bababa;\n  width: 90%;\n  pointer-events: auto;\n}\n\n:host(.sources-edit-breakpoint-dialog) {\n  border: none;\n  border-radius: 0;\n  z-index: 30;\n  background-color: var(--toolbar-bg-color);\n  width: 555px;\n  pointer-events: auto;\n  margin: 2px 0 2px -1px;\n  padding: 0 10px 10px 5px;\n  border: 1px solid var(--divider-color);\n}\n\n:host-context(.sources-edit-breakpoint-dialog) .condition-editor {\n  background-color: #fff;\n  margin-left: 3px;\n}\n\n:host-context(.sources-edit-breakpoint-dialog) .source-frame-breakpoint-toolbar {\n  font-family: sans-serif;\n  font-size: 12px;\n}\n\n/*# sourceURL=sources/breakpointEditDialog.css */";Runtime.cachedResources["sources/callStackSidebarPane.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.blackboxed-message {\n    text-align: center;\n    font-style: italic;\n    padding: 4px;\n    color: #888;\n    background-color: #FFFFC2;\n}\n\n.blackboxed-message > .link {\n    margin-left: 5px;\n}\n\n.show-more-message {\n    text-align: center;\n    font-style: italic;\n    padding: 4px;\n    border-top: 1px solid #d8d8d8;\n}\n\n.show-more-message > .link {\n    margin-left: 5px;\n}\n\n.call-frame-item {\n    padding: 3px 8px 3px 20px;\n    position: relative;\n    min-height: 18px;\n    line-height: 15px;\n    display: flex;\n    flex-wrap: wrap;\n}\n\n.call-frame-title-text {\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.call-frame-item:not(.async-header) {\n    border-top: 1px solid #efefef;\n}\n\n.call-frame-item:not(.async-header):hover {\n    background-color: #eee;\n}\n\n.async-header + .call-frame-item {\n    border-top: 0;\n}\n\n.call-frame-item-title,\n.call-frame-location {\n    display: flex;\n    white-space: nowrap;\n}\n\n.call-frame-location {\n    color: #888;\n    margin-left: auto;\n    padding: 0 10px 0 10px;\n}\n\n.async-header::before {\n    content: \" \";\n    width: 100%;\n    border-top: 1px solid #d8d8d8;\n    margin-top: 8px;\n    position: absolute;\n    z-index: -1;\n    left: 0;\n}\n\n.async-header .call-frame-item-title {\n    font-weight: bold;\n    color: #999;\n    background-color: white;\n    margin-left: -5px;\n    padding: 0 5px;\n}\n\n.blackboxed-call-frame {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n.selected-call-frame-icon {\n    display: none;\n    position: absolute;\n    top: 5px;\n    left: 4px;\n}\n\n.call-frame-item.selected .selected-call-frame-icon {\n    display: block;\n}\n\n:host-context(.-theme-with-dark-background) .blackboxed-message {\n    background-color: hsl(46, 98%, 22%);\n    color: #aaa;\n}\n\n:host-context(.-theme-with-dark-background) .blackboxed-message > .link {\n    color: hsl(0, 0%, 67%);\n}\n\n/*# sourceURL=sources/callStackSidebarPane.css */";Runtime.cachedResources["sources/debuggerPausedMessage.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.paused-status {\n    padding: 6px;\n    border-bottom: 1px solid transparent;\n    border-top: 1px solid rgb(189, 189, 189);\n    background-color: hsl(50, 100%, 95%);\n    color: rgb(107, 97, 48);\n}\n\n.-theme-with-dark-background .paused-status {\n    background-color: hsl(46, 98%, 22%);\n    color: #ccc;\n}\n\n.paused-status.error-reason {\n    background-color: hsl(0, 100%, 97%);\n    color: #6b3b3b;\n}\n\n.status-main {\n    font-weight: bold;\n    padding-left: 15px;\n    position: relative;\n}\n\n.status-sub:not(:empty) {\n    padding-left: 15px;\n    padding-top: 5px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.paused-status.error-reason .status-sub {\n    color: red;\n    line-height: 11px;\n    max-height: 27px;\n    -webkit-user-select: text;\n}\n\n.status-icon {\n    -webkit-filter: hue-rotate(190deg);\n    position: absolute;\n    left: 0;\n    top: calc(50% - 5px);\n}\n\n.paused-status.error-reason .status-icon {\n    -webkit-filter: none;\n}\n\n/*# sourceURL=sources/debuggerPausedMessage.css */";Runtime.cachedResources["sources/javaScriptBreakpointsSidebarPane.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.breakpoint-entry {\n    padding: 3px 8px 3px 8px;\n    min-height: 18px;\n    line-height: 15px;\n    border-top: 1px solid #efefef;\n}\n\n.breakpoint-entry [is=dt-checkbox] {\n    max-width: 100%;\n    white-space: nowrap;\n}\n\n:not(.breakpoints-list-deactivated) > .breakpoint-entry:hover {\n    background-color: #eee;\n}\n\n.breakpoint-entry > .source-text {\n    cursor: pointer;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n    margin-left: 22px;\n}\n\n.breakpoints-list-deactivated {\n    background-color: #eee;\n    opacity: 0.3;\n}\n\n.breakpoint-hit {\n    background-color: rgb(255, 255, 194);\n}\n\n:host-context(.-theme-with-dark-background) .breakpoint-hit {\n    background-color: hsl(46, 98%, 22%);\n    color: #ccc;\n}\n\n/*# sourceURL=sources/javaScriptBreakpointsSidebarPane.css */";Runtime.cachedResources["sources/navigatorTree.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.icon, .icon-badge {\n    margin: -3px -5px -3px -5px;\n}\n\n.icon-stack {\n    position: relative;\n    display: inline-flex;\n}\n\n.icon-stack > [is=ui-icon]:not(:first-child) {\n    position: absolute;\n    left: 0;\n    top: 0;\n}\n\n.navigator-file-tree-item .icon {\n    background: linear-gradient(45deg, hsl(0, 0%, 50%), hsl(0, 0%, 70%));\n}\n\n.navigator-fs-tree-item:not(.has-mapped-files):not(.selected) > :not(.selection),\n.navigator-fs-folder-tree-item:not(.has-mapped-files):not(.selected) > :not(.selection) {\n    filter: grayscale(50%);\n    opacity: 0.5;\n}\n\n.tree-outline li {\n    min-height: 20px;\n}\n\n.tree-outline li:hover:not(.selected) .selection {\n    display: block;\n    background-color: rgba(56, 121, 217, 0.1);\n}\n\n.navigator-folder-tree-item .icon {\n    background-color: #555;\n}\n\n.navigator-sm-folder-tree-item .icon,\n.navigator-fs-tree-item .icon,\n.navigator-fs-folder-tree-item .icon {\n    background: linear-gradient(45deg, hsl(28, 75%, 50%), hsl(28, 75%, 70%));\n}\n\n.navigator-nw-folder-tree-item .icon {\n    background: linear-gradient(45deg, hsl(210, 82%, 65%), hsl(210, 82%, 80%));\n}\n\n.navigator-sm-script-tree-item .icon,\n.navigator-script-tree-item .icon,\n.navigator-snippet-tree-item .icon {\n    background: linear-gradient(45deg, hsl(48, 70%, 50%), hsl(48, 70%, 70%));\n}\n\n.navigator-sm-stylesheet-tree-item .icon,\n.navigator-stylesheet-tree-item .icon {\n    background: linear-gradient(45deg, hsl(256, 50%, 50%), hsl(256, 50%, 70%));\n}\n\n.navigator-image-tree-item .icon,\n.navigator-font-tree-item .icon {\n    background: linear-gradient(45deg, hsl(109, 33%, 50%), hsl(109, 33%, 70%));\n}\n\n.navigator-sm-folder-tree-item .tree-element-title,\n.navigator-sm-script-tree-item .tree-element-title,\n.navigator-sm-stylesheet-tree-item .tree-element-title {\n    font-style: italic;\n}\n\n:host{\n    overflow-y: auto;\n}\n\n/*# sourceURL=sources/navigatorTree.css */";Runtime.cachedResources["sources/navigatorView.css"]="/*\n * Copyright 2016 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.navigator-toolbar {\n    border-bottom: 1px solid #ccc;\n    padding-left: 8px;\n}\n\n/*# sourceURL=sources/navigatorView.css */";Runtime.cachedResources["sources/scopeChainSidebarPane.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.scope-chain-sidebar-pane-section-header {\n    flex: auto;\n}\n\n.scope-chain-sidebar-pane-section-subtitle {\n    float: right;\n    margin-left: 5px;\n    max-width: 55%;\n    text-overflow: ellipsis;\n    overflow: hidden;\n}\n\n.scope-chain-sidebar-pane-section-title {\n    font-weight: normal;\n    word-wrap: break-word;\n    white-space: normal;\n}\n\n.scope-chain-sidebar-pane-section {\n    padding: 2px 4px;\n    flex: none;\n}\n\n/*# sourceURL=sources/scopeChainSidebarPane.css */";Runtime.cachedResources["sources/sourcesPanel.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.scripts-debug-toolbar {\n    position: absolute;\n    top: 0;\n    width: 100%;\n    background-color: var(--toolbar-bg-color);\n    border-bottom: 1px solid #ccc;\n    overflow: hidden;\n}\n\n.scripts-debug-toolbar-drawer {\n    flex: 0 0 52px;\n    -webkit-transition: margin-top 0.1s ease-in-out;\n    margin-top: -26px;\n    padding-top: 25px;\n    background-color: white;\n    overflow: hidden;\n    white-space: nowrap;\n}\n\n.scripts-debug-toolbar-drawer.expanded {\n    margin-top: 0;\n}\n\n.scripts-debug-toolbar-drawer > [is=dt-checkbox] {\n    display: flex;\n    padding-left: 3px;\n    height: 28px;\n}\n\n.cursor-auto {\n    cursor: auto;\n}\n\n.navigator-tabbed-pane {\n    background-color: var(--toolbar-bg-color);\n}\n\n/*# sourceURL=sources/sourcesPanel.css */";Runtime.cachedResources["sources/sourcesView.css"]="/*\n * Copyright (C) 2013 Google Inc. All rights reserved.\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions are\n * met:\n *\n *     * Redistributions of source code must retain the above copyright\n * notice, this list of conditions and the following disclaimer.\n *     * Redistributions in binary form must reproduce the above\n * copyright notice, this list of conditions and the following disclaimer\n * in the documentation and/or other materials provided with the\n * distribution.\n *     * Neither the name of Google Inc. nor the names of its\n * contributors may be used to endorse or promote products derived from\n * this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n * \"AS IS\" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT\n * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,\n * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT\n * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,\n * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY\n * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n#sources-panel-sources-view {\n    flex: auto;\n    position: relative;\n}\n\n#sources-panel-sources-view .sources-toolbar {\n    display: flex;\n    flex: 0 0 27px;\n    background-color: var(--toolbar-bg-color);\n    border-top: var(--divider-border);\n    overflow: hidden;\n    z-index: 0;\n}\n\n.sources-toolbar .toolbar {\n    cursor: default;\n}\n\n.source-frame-debugger-script {\n    background-color: rgba(255, 255, 194, 0.5);\n}\n\n.-theme-with-dark-background .source-frame-debugger-script {\n    background-color: #444;\n}\n\n@-webkit-keyframes source-frame-value-update-highlight-animation {\n    from {\n        background-color: inherit;\n        color: inherit;\n    }\n    10% {\n        background-color: rgb(158, 54, 153);\n        color: white;\n    }\n    to {\n        background-color: inherit;\n        color: inherit;\n    }\n}\n\n.source-frame-value-update-highlight {\n    -webkit-animation: source-frame-value-update-highlight-animation 0.8s 1 cubic-bezier(0, 0, 0.2, 1);\n    border-radius: 2px;\n}\n\n.diff-entry-insert .diff-marker {\n    border-left: 4px solid hsla(144, 55%, 37%, 1);\n}\n\n.diff-entry-insert .CodeMirror-gutter-background {\n    background-color: hsla(144,55%,49%,.2);\n}\n\n.diff-entry-modify .diff-marker {\n    border-left: 4px solid #9C27B0;\n}\n\n.diff-entry-modify .CodeMirror-gutter-background {\n    background-color: rgba(186,104,200,0.2);\n}\n\n.diff-entry-delete .diff-marker {\n    width: 0;\n    height: 0;\n    border-top: 6px solid transparent;\n    border-bottom: 6px solid transparent;\n    border-left: 6px solid #D32F2F;\n    position: relative;\n    top: 6px;\n    cursor: pointer;\n    left: 0px;\n}\n\n.diff-entry-delete .CodeMirror-gutter-background {\n    border-bottom: 2px solid #D32F2F;\n}\n\n.CodeMirror-gutter-diff {\n    width: 4px;\n}\n\n.highlight-line-modification {\n    animation: source-line-modification-background-fadeout 0.4s 0s;\n    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n}\n\n.highlight-line-modification span {\n    animation: source-line-modification-foreground-fadeout 0.4s 0s;\n    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);\n}\n\n@keyframes source-line-modification-background-fadeout {\n    from { background-color: rgba(158, 54, 153, 0.5); }\n    50% { background-color: rgba(158, 54, 153, 0.5); }\n    90% { background-color: rgba(158, 54, 153, 0); }\n    to { background-color: transparent; }\n}\n\n@keyframes source-line-modification-foreground-fadeout {\n    from { color: white; }\n    50% { color: white; }\n    90% { color: initial; }\n    to { color: initial; }\n}\n\n/*# sourceURL=sources/sourcesView.css */";Runtime.cachedResources["sources/threadsSidebarPane.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.thread-item {\n    padding: 3px 8px 3px 20px;\n    position: relative;\n    min-height: 18px;\n    line-height: 15px;\n    display: flex;\n    flex-wrap: wrap;\n}\n\n.thread-item + .thread-item {\n    border-top: 1px solid #efefef;\n}\n\n.thread-item:hover {\n    background-color: #eee;\n}\n\n.thread-item-title,\n.thread-item-paused-state {\n    text-overflow: ellipsis;\n    overflow: hidden;\n    white-space: nowrap;\n}\n\n.thread-item-paused-state {\n    color: #888;\n    margin-left: auto;\n    padding: 0 10px 0 10px;\n}\n\n.selected-thread-icon {\n    display: none;\n    position: absolute;\n    top: 5px;\n    left: 4px;\n}\n\n.thread-item.selected .selected-thread-icon {\n    display: block;\n}\n\n\n/*# sourceURL=sources/threadsSidebarPane.css */";Runtime.cachedResources["sources/watchExpressionsSidebarPane.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.watch-expression-delete-button {\n    position: absolute;\n    top: 5px;\n    right: 6px;\n    cursor: pointer;\n    opacity: 0;\n    min-width: 20px;\n}\n\n.watch-expression-header:hover .watch-expression-delete-button {\n    opacity: 0.5;\n}\n\n.watch-expression-header:hover .watch-expression-delete-button:hover {\n    opacity: 1;\n}\n\n.watch-expressions {\n    overflow-x: hidden;\n    min-height: 26px;\n}\n\n.watch-expressions .dimmed {\n    opacity: 0.6;\n}\n\n.watch-expression-title {\n    white-space: nowrap;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    line-height: 20px;\n    margin-left: 16px;\n}\n\n.watch-expression-object-header .watch-expression-title {\n    margin-left: 1px;\n}\n\n.watch-expression {\n    position: relative;\n    flex: none;\n    min-height: 20px;\n}\n\n.watch-expressions .name {\n    color: rgb(136, 19, 145);\n    flex: none;\n    white-space: nowrap;\n    text-overflow: ellipsis ;\n    overflow: hidden;\n}\n\n.watch-expression-error {\n    color: red;\n}\n\n:host-context(.-theme-with-dark-background) .watch-expression-error {\n    color: hsl(0, 100%, 65%);\n}\n\n.watch-expressions-separator {\n    flex: none;\n}\n\n.watch-expressions .value {\n    white-space: nowrap;\n    display: inline;\n}\n\n.watch-expression .text-prompt {\n    text-overflow: clip;\n    overflow: hidden;\n    white-space: nowrap;\n    padding-left: 4px;\n    min-height: 18px;\n    line-height: 18px;\n    -webkit-user-select: text;\n}\n\n.watch-expression-text-prompt-proxy {\n    margin: 2px 12px;\n    padding-bottom: 3px;\n}\n\n.watch-expression-header {\n    flex: auto;\n}\n\n.watch-expression-object-header {\n    margin-left: -16px;\n    padding-left: 15px;\n}\n\n.watch-expression-header:hover {\n    background-color: #F0F0F0;\n    padding-right: 28px;\n}\n\n.watch-expression-object {\n    padding-left: 5px;\n}\n\n/*# sourceURL=sources/watchExpressionsSidebarPane.css */";Runtime.cachedResources["sources/dialog.css"]="/*\n * Copyright (c) 2015 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    padding: 10px;\n}\n\n.widget {\n    align-items: center;\n}\n\nlabel {\n    white-space: nowrap;\n}\n\ninput[type=text] {\n    font-size: inherit;\n    height: 24px;\n    padding-left: 2px;\n    margin: 0 5px;\n}\n\ninput[type=\"search\"]:focus,\ninput[type=\"text\"]:focus {\n    outline: none;\n}\n\nbutton {\n    background-image: linear-gradient(hsl(0, 0%, 93%), hsl(0, 0%, 93%) 38%, hsl(0, 0%, 87%));\n    border: 1px solid hsla(0, 0%, 0%, 0.25);\n    border-radius: 2px;\n    box-shadow: 0 1px 0 hsla(0, 0%, 0%, 0.08), inset 0 1px 2px hsla(0, 100%, 100%, 0.75);\n    color: hsl(0, 0%, 27%);\n    font-size: 12px;\n    margin: 0 6px 0 6px;\n    text-shadow: 0 1px 0 hsl(0, 0%, 94%);\n    min-height: 2em;\n    padding-left: 10px;\n    padding-right: 10px;\n}\n\nbutton:active {\n    background-color: rgb(215, 215, 215);\n    background-image: linear-gradient(to bottom, rgb(194, 194, 194), rgb(239, 239, 239));\n}\n\n/*# sourceURL=sources/dialog.css */";