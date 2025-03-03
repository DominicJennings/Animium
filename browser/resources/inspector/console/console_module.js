Console.ConsoleContextSelector=class{constructor(){this._items=new UI.ListModel();this._dropDown=new UI.SoftDropDown(this._items,this);this._dropDown.setRowHeight(36);this._toolbarItem=new UI.ToolbarItem(this._dropDown.element);this._toolbarItem.setEnabled(false);this._toolbarItem.setTitle(ls`JavaScript context: Not selected`);this._items.addEventListener(UI.ListModel.Events.ItemsReplaced,()=>this._toolbarItem.setEnabled(!!this._items.length));this._badgePoolForExecutionContext=new Map();this._toolbarItem.element.classList.add('toolbar-has-dropdown');SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextCreated,this._onExecutionContextCreated,this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextChanged,this._onExecutionContextChanged,this);SDK.targetManager.addModelListener(SDK.RuntimeModel,SDK.RuntimeModel.Events.ExecutionContextDestroyed,this._onExecutionContextDestroyed,this);SDK.targetManager.addModelListener(SDK.ResourceTreeModel,SDK.ResourceTreeModel.Events.FrameNavigated,this._frameNavigated,this);UI.context.addFlavorChangeListener(SDK.ExecutionContext,this._executionContextChangedExternally,this);UI.context.addFlavorChangeListener(SDK.DebuggerModel.CallFrame,this._callFrameSelectedInUI,this);SDK.targetManager.observeModels(SDK.RuntimeModel,this);SDK.targetManager.addModelListener(SDK.DebuggerModel,SDK.DebuggerModel.Events.CallFrameSelected,this._callFrameSelectedInModel,this);}
toolbarItem(){return this._toolbarItem;}
highlightedItemChanged(from,to,fromElement,toElement){SDK.OverlayModel.hideDOMNodeHighlight();if(to&&to.frameId){const overlayModel=to.target().model(SDK.OverlayModel);if(overlayModel)
overlayModel.highlightFrame(to.frameId);}
if(fromElement)
fromElement.classList.remove('highlighted');if(toElement)
toElement.classList.add('highlighted');}
titleFor(executionContext){const target=executionContext.target();let label=executionContext.label()?target.decorateLabel(executionContext.label()):'';if(executionContext.frameId){const resourceTreeModel=target.model(SDK.ResourceTreeModel);const frame=resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);if(frame)
label=label||frame.displayName();}
label=label||executionContext.origin;return label;}
_depthFor(executionContext){let target=executionContext.target();let depth=0;if(!executionContext.isDefault)
depth++;if(executionContext.frameId){const resourceTreeModel=target.model(SDK.ResourceTreeModel);let frame=resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);while(frame){frame=frame.parentFrame||frame.crossTargetParentFrame();if(frame){depth++;target=frame.resourceTreeModel().target();}}}
let targetDepth=0;while(target.parentTarget()){if(target.parentTarget().type()===SDK.Target.Type.ServiceWorker){targetDepth=0;break;}
targetDepth++;target=target.parentTarget();}
depth+=targetDepth;return depth;}
_badgeFor(executionContext){if(!executionContext.frameId||!executionContext.isDefault)
return null;const resourceTreeModel=executionContext.target().model(SDK.ResourceTreeModel);const frame=resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);if(!frame)
return null;const badgePool=new ProductRegistry.BadgePool();this._badgePoolForExecutionContext.set(executionContext,badgePool);return badgePool.badgeForFrame(frame);}
_disposeExecutionContextBadge(executionContext){const badgePool=this._badgePoolForExecutionContext.get(executionContext);if(!badgePool)
return;badgePool.reset();this._badgePoolForExecutionContext.delete(executionContext);}
_executionContextCreated(executionContext){if(executionContext.target().type()===SDK.Target.Type.ServiceWorker)
return;this._items.insertWithComparator(executionContext,executionContext.runtimeModel.executionContextComparator());if(executionContext===UI.context.flavor(SDK.ExecutionContext))
this._dropDown.selectItem(executionContext);}
_onExecutionContextCreated(event){const executionContext=(event.data);this._executionContextCreated(executionContext);}
_onExecutionContextChanged(event){const executionContext=(event.data);if(this._items.indexOf(executionContext)===-1)
return;this._executionContextDestroyed(executionContext);this._executionContextCreated(executionContext);}
_executionContextDestroyed(executionContext){const index=this._items.indexOf(executionContext);if(index===-1)
return;this._disposeExecutionContextBadge(executionContext);this._items.remove(index);}
_onExecutionContextDestroyed(event){const executionContext=(event.data);this._executionContextDestroyed(executionContext);}
_executionContextChangedExternally(event){const executionContext=(event.data);this._dropDown.selectItem(executionContext);}
_isTopContext(executionContext){if(!executionContext||!executionContext.isDefault)
return false;const resourceTreeModel=executionContext.target().model(SDK.ResourceTreeModel);const frame=executionContext.frameId&&resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);if(!frame)
return false;return frame.isTopFrame();}
_hasTopContext(){return this._items.some(executionContext=>this._isTopContext(executionContext));}
modelAdded(runtimeModel){runtimeModel.executionContexts().forEach(this._executionContextCreated,this);}
modelRemoved(runtimeModel){for(let i=this._items.length-1;i>=0;i--){if(this._items.at(i).runtimeModel===runtimeModel)
this._executionContextDestroyed(this._items.at(i));}}
createElementForItem(item){const element=createElementWithClass('div');const shadowRoot=UI.createShadowRootWithCoreStyles(element,'console/consoleContextSelector.css');const title=shadowRoot.createChild('div','title');title.createTextChild(this.titleFor(item).trimEnd(100));const subTitle=shadowRoot.createChild('div','subtitle');const badgeElement=this._badgeFor(item);if(badgeElement){badgeElement.classList.add('badge');subTitle.appendChild(badgeElement);}
subTitle.createTextChild(this._subtitleFor(item));element.style.paddingLeft=(8+this._depthFor(item)*15)+'px';return element;}
_subtitleFor(executionContext){const target=executionContext.target();let frame;if(executionContext.frameId){const resourceTreeModel=target.model(SDK.ResourceTreeModel);frame=resourceTreeModel&&resourceTreeModel.frameForId(executionContext.frameId);}
if(executionContext.origin.startsWith('chrome-extension://'))
return Common.UIString('Extension');if(!frame||!frame.parentFrame||frame.parentFrame.securityOrigin!==executionContext.origin){const url=executionContext.origin.asParsedURL();if(url)
return url.domain();}
if(frame){const callFrame=frame.findCreationCallFrame(callFrame=>!!callFrame.url);if(callFrame)
return new Common.ParsedURL(callFrame.url).domain();return Common.UIString('IFrame');}
return'';}
isItemSelectable(item){const callFrame=item.debuggerModel.selectedCallFrame();const callFrameContext=callFrame&&callFrame.script.executionContext();return!callFrameContext||item===callFrameContext;}
itemSelected(item){this._toolbarItem.element.classList.toggle('warning',!this._isTopContext(item)&&this._hasTopContext());const title=item?ls`JavaScript context: ${this.titleFor(item)}`:ls`JavaScript context: Not selected`;this._toolbarItem.setTitle(title);UI.context.setFlavor(SDK.ExecutionContext,item);}
_callFrameSelectedInUI(){const callFrame=UI.context.flavor(SDK.DebuggerModel.CallFrame);const callFrameContext=callFrame&&callFrame.script.executionContext();if(callFrameContext)
UI.context.setFlavor(SDK.ExecutionContext,callFrameContext);}
_callFrameSelectedInModel(event){const debuggerModel=(event.data);for(const executionContext of this._items){if(executionContext.debuggerModel===debuggerModel){this._disposeExecutionContextBadge(executionContext);this._dropDown.refreshItem(executionContext);}}}
_frameNavigated(event){const frame=(event.data);const runtimeModel=frame.resourceTreeModel().target().model(SDK.RuntimeModel);if(!runtimeModel)
return;for(const executionContext of runtimeModel.executionContexts()){if(frame.id===executionContext.frameId){this._disposeExecutionContextBadge(executionContext);this._dropDown.refreshItem(executionContext);}}}};;Console.ConsoleFilter=class{constructor(name,parsedFilters,executionContext,levelsMask){this.name=name;this.parsedFilters=parsedFilters;this.executionContext=executionContext;this.levelsMask=levelsMask||Console.ConsoleFilter.defaultLevelsFilterValue();}
static allLevelsFilterValue(){const result={};for(const name of Object.values(SDK.ConsoleMessage.MessageLevel))
result[name]=true;return result;}
static defaultLevelsFilterValue(){const result=Console.ConsoleFilter.allLevelsFilterValue();result[SDK.ConsoleMessage.MessageLevel.Verbose]=false;return result;}
static singleLevelMask(level){const result={};result[level]=true;return result;}
clone(){const parsedFilters=this.parsedFilters.map(TextUtils.FilterParser.cloneFilter);const levelsMask=Object.assign({},this.levelsMask);return new Console.ConsoleFilter(this.name,parsedFilters,this.executionContext,levelsMask);}
shouldBeVisible(viewMessage){const message=viewMessage.consoleMessage();if(this.executionContext&&(this.executionContext.runtimeModel!==message.runtimeModel()||this.executionContext.id!==message.executionContextId))
return false;if(message.type===SDK.ConsoleMessage.MessageType.Command||message.type===SDK.ConsoleMessage.MessageType.Result||message.isGroupMessage())
return true;if(message.level&&!this.levelsMask[(message.level)])
return false;for(const filter of this.parsedFilters){if(!filter.key){if(filter.regex&&viewMessage.matchesFilterRegex(filter.regex)===filter.negative)
return false;if(filter.text&&viewMessage.matchesFilterText(filter.text)===filter.negative)
return false;}else{switch(filter.key){case Console.ConsoleFilter.FilterType.Context:if(!passesFilter(filter,message.context,false))
return false;break;case Console.ConsoleFilter.FilterType.Source:const sourceNameForMessage=message.source?SDK.ConsoleMessage.MessageSourceDisplayName.get((message.source)):message.source;if(!passesFilter(filter,sourceNameForMessage,true))
return false;break;case Console.ConsoleFilter.FilterType.Url:if(!passesFilter(filter,message.url,false))
return false;break;}}}
return true;function passesFilter(filter,value,exactMatch){if(!filter.text)
return!!value===filter.negative;if(!value)
return!filter.text===!filter.negative;const filterText=(filter.text).toLowerCase();const lowerCaseValue=value.toLowerCase();if(exactMatch&&(lowerCaseValue===filterText)===filter.negative)
return false;if(!exactMatch&&lowerCaseValue.includes(filterText)===filter.negative)
return false;return true;}}};Console.ConsoleFilter.FilterType={Context:'context',Source:'source',Url:'url'};;Console.ConsolePinPane=class extends UI.ThrottledWidget{constructor(){super(true,250);this.registerRequiredCSS('console/consolePinPane.css');this.registerRequiredCSS('object_ui/objectValue.css');this.contentElement.classList.add('console-pins','monospace');this.contentElement.addEventListener('contextmenu',this._contextMenuEventFired.bind(this),false);this._pins=new Set();this._pinsSetting=Common.settings.createLocalSetting('consolePins',[]);for(const expression of this._pinsSetting.get())
this.addPin(expression);}
willHide(){for(const pin of this._pins)
pin.setHovered(false);}
_savePins(){const toSave=Array.from(this._pins).map(pin=>pin.expression());this._pinsSetting.set(toSave);}
_contextMenuEventFired(event){const contextMenu=new UI.ContextMenu(event);const target=event.deepElementFromPoint();if(target){const targetPinElement=target.enclosingNodeOrSelfWithClass('console-pin');if(targetPinElement){const targetPin=targetPinElement[Console.ConsolePin._PinSymbol];contextMenu.editSection().appendItem(ls`Edit expression`,targetPin.focus.bind(targetPin));contextMenu.editSection().appendItem(ls`Remove expression`,this._removePin.bind(this,targetPin));targetPin.appendToContextMenu(contextMenu);}}
contextMenu.editSection().appendItem(ls`Remove all expressions`,this._removeAllPins.bind(this));contextMenu.show();}
_removeAllPins(){for(const pin of this._pins)
this._removePin(pin);}
_removePin(pin){pin.element().remove();this._pins.delete(pin);this._savePins();}
addPin(expression,userGesture){const pin=new Console.ConsolePin(expression,this);this.contentElement.appendChild(pin.element());this._pins.add(pin);this._savePins();if(userGesture)
pin.focus();this.update();}
doUpdate(){if(!this._pins.size||!this.isShowing())
return Promise.resolve();if(this.isShowing())
this.update();const updatePromises=Array.from(this._pins,pin=>pin.updatePreview());return Promise.all(updatePromises).then(this._updatedForTest.bind(this));}
_updatedForTest(){}};Console.ConsolePin=class extends Common.Object{constructor(expression,pinPane){super();const deletePinIcon=UI.Icon.create('smallicon-cross','console-delete-pin');deletePinIcon.addEventListener('click',()=>pinPane._removePin(this));deletePinIcon.addEventListener('keydown',event=>{if(isEnterKey(event)||event.key===' ')
pinPane._removePin(this);});deletePinIcon.tabIndex=0;UI.ARIAUtils.setAccessibleName(deletePinIcon,ls`Remove expression`);UI.ARIAUtils.markAsButton(deletePinIcon);const fragment=UI.Fragment.build`
    <div class='console-pin'>
      ${deletePinIcon}
      <div class='console-pin-name' $='name'></div>
      <div class='console-pin-preview' $='preview'>${ls`not available`}</div>
    </div>`;this._pinElement=fragment.element();this._pinPreview=fragment.$('preview');const nameElement=fragment.$('name');nameElement.title=expression;this._pinElement[Console.ConsolePin._PinSymbol]=this;this._lastResult=null;this._lastExecutionContext=null;this._editor=null;this._committedExpression=expression;this._hovered=false;this._lastNode=null;this._pinPreview.addEventListener('mouseenter',this.setHovered.bind(this,true),false);this._pinPreview.addEventListener('mouseleave',this.setHovered.bind(this,false),false);this._pinPreview.addEventListener('click',event=>{if(this._lastNode){Common.Revealer.reveal(this._lastNode);event.consume();}},false);this._editorPromise=self.runtime.extension(UI.TextEditorFactory).instance().then(factory=>{this._editor=factory.createEditor({devtoolsAccessibleName:ls`Live expression editor`,lineNumbers:false,lineWrapping:true,mimeType:'javascript',autoHeight:true,placeholder:ls`Expression`});this._editor.configureAutocomplete(ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor));this._editor.widget().show(nameElement);this._editor.widget().element.classList.add('console-pin-editor');this._editor.widget().element.tabIndex=-1;this._editor.setText(expression);this._editor.widget().element.addEventListener('keydown',event=>{if(event.key==='Tab'&&!this._editor.text()){event.consume();return;}
if(event.keyCode===UI.KeyboardShortcut.Keys.Esc.code)
this._editor.setText(this._committedExpression);},true);this._editor.widget().element.addEventListener('focusout',event=>{const text=this._editor.text();const trimmedText=text.trim();if(text.length!==trimmedText.length)
this._editor.setText(trimmedText);this._committedExpression=trimmedText;pinPane._savePins();this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity,Infinity));});});}
setHovered(hovered){if(this._hovered===hovered)
return;this._hovered=hovered;if(!hovered&&this._lastNode)
SDK.OverlayModel.hideDOMNodeHighlight();}
expression(){return this._committedExpression;}
element(){return this._pinElement;}
async focus(){await this._editorPromise;this._editor.widget().focus();this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity,Infinity));}
appendToContextMenu(contextMenu){if(this._lastResult&&this._lastResult.object){contextMenu.appendApplicableItems(this._lastResult.object);this._lastResult=null;}}
async updatePreview(){if(!this._editor)
return;const text=this._editor.textWithCurrentSuggestion().trim();const isEditing=this._pinElement.hasFocus();const throwOnSideEffect=isEditing&&text!==this._committedExpression;const timeout=throwOnSideEffect?250:undefined;const executionContext=UI.context.flavor(SDK.ExecutionContext);const{preview,result}=await ObjectUI.JavaScriptREPL.evaluateAndBuildPreview(text,throwOnSideEffect,timeout,!isEditing,'console');if(this._lastResult&&this._lastExecutionContext)
this._lastExecutionContext.runtimeModel.releaseEvaluationResult(this._lastResult);this._lastResult=result||null;this._lastExecutionContext=executionContext||null;const previewText=preview.deepTextContent();if(!previewText||previewText!==this._pinPreview.deepTextContent()){this._pinPreview.removeChildren();if(result&&SDK.RuntimeModel.isSideEffectFailure(result)){const sideEffectLabel=this._pinPreview.createChild('span','object-value-calculate-value-button');sideEffectLabel.textContent=`(...)`;sideEffectLabel.title=ls`Evaluate, allowing side effects`;}else if(previewText){this._pinPreview.appendChild(preview);}else if(!isEditing){this._pinPreview.createTextChild(ls`not available`);}
this._pinPreview.title=previewText;}
let node=null;if(result&&result.object&&result.object.type==='object'&&result.object.subtype==='node')
node=result.object;if(this._hovered){if(node)
SDK.OverlayModel.highlightObjectAsDOMNode(node);else if(this._lastNode)
SDK.OverlayModel.hideDOMNodeHighlight();}
this._lastNode=node||null;const isError=result&&result.exceptionDetails&&!SDK.RuntimeModel.isSideEffectFailure(result);this._pinElement.classList.toggle('error-level',isError);}};Console.ConsolePin._PinSymbol=Symbol('pinSymbol');;Console.ConsoleSidebar=class extends UI.VBox{constructor(badgePool){super(true);this.setMinimumSize(125,0);this._tree=new UI.TreeOutlineInShadow();this._tree.registerRequiredCSS('console/consoleSidebar.css');this._tree.addEventListener(UI.TreeOutline.Events.ElementSelected,this._selectionChanged.bind(this));this.contentElement.appendChild(this._tree.element);this._selectedTreeElement=null;this._treeElements=[];const selectedFilterSetting=Common.settings.createSetting('console.sidebarSelectedFilter',null);const Levels=SDK.ConsoleMessage.MessageLevel;const consoleAPIParsedFilters=[{key:Console.ConsoleFilter.FilterType.Source,text:SDK.ConsoleMessage.MessageSource.ConsoleAPI,negative:false}];this._appendGroup(Console.ConsoleSidebar._groupSingularName.All,[],Console.ConsoleFilter.allLevelsFilterValue(),UI.Icon.create('mediumicon-list'),badgePool,selectedFilterSetting);this._appendGroup(Console.ConsoleSidebar._groupSingularName.ConsoleAPI,consoleAPIParsedFilters,Console.ConsoleFilter.allLevelsFilterValue(),UI.Icon.create('mediumicon-account-circle'),badgePool,selectedFilterSetting);this._appendGroup(Console.ConsoleSidebar._groupSingularName.Error,[],Console.ConsoleFilter.singleLevelMask(Levels.Error),UI.Icon.create('mediumicon-error-circle'),badgePool,selectedFilterSetting);this._appendGroup(Console.ConsoleSidebar._groupSingularName.Warning,[],Console.ConsoleFilter.singleLevelMask(Levels.Warning),UI.Icon.create('mediumicon-warning-triangle'),badgePool,selectedFilterSetting);this._appendGroup(Console.ConsoleSidebar._groupSingularName.Info,[],Console.ConsoleFilter.singleLevelMask(Levels.Info),UI.Icon.create('mediumicon-info-circle'),badgePool,selectedFilterSetting);this._appendGroup(Console.ConsoleSidebar._groupSingularName.Verbose,[],Console.ConsoleFilter.singleLevelMask(Levels.Verbose),UI.Icon.create('mediumicon-bug'),badgePool,selectedFilterSetting);const selectedTreeElementName=selectedFilterSetting.get();const defaultTreeElement=this._treeElements.find(x=>x.name()===selectedTreeElementName)||this._treeElements[0];defaultTreeElement.select();}
_appendGroup(name,parsedFilters,levelsMask,icon,badgePool,selectedFilterSetting){const filter=new Console.ConsoleFilter(name,parsedFilters,null,levelsMask);const treeElement=new Console.ConsoleSidebar.FilterTreeElement(filter,icon,badgePool,selectedFilterSetting);this._tree.appendChild(treeElement);this._treeElements.push(treeElement);}
clear(){for(const treeElement of this._treeElements)
treeElement.clear();}
onMessageAdded(viewMessage){for(const treeElement of this._treeElements)
treeElement.onMessageAdded(viewMessage);}
shouldBeVisible(viewMessage){if(!this._selectedTreeElement)
return true;return this._selectedTreeElement._filter.shouldBeVisible(viewMessage);}
_selectionChanged(event){this._selectedTreeElement=(event.data);this.dispatchEventToListeners(Console.ConsoleSidebar.Events.FilterSelected);}};Console.ConsoleSidebar.Events={FilterSelected:Symbol('FilterSelected')};Console.ConsoleSidebar.URLGroupTreeElement=class extends UI.TreeElement{constructor(filter,badge){super(filter.name);this._filter=filter;this._countElement=this.listItemElement.createChild('span','count');const leadingIcons=[UI.Icon.create('largeicon-navigator-file')];if(badge)
leadingIcons.push(badge);this.setLeadingIcons(leadingIcons);this._messageCount=0;}
incrementAndUpdateCounter(){this._messageCount++;this._countElement.textContent=this._messageCount;}};Console.ConsoleSidebar.FilterTreeElement=class extends UI.TreeElement{constructor(filter,icon,badgePool,selectedFilterSetting){super(filter.name);this._filter=filter;this._badgePool=badgePool;this._selectedFilterSetting=selectedFilterSetting;this._urlTreeElements=new Map();this.setLeadingIcons([icon]);this._messageCount=0;this._updateCounter();}
clear(){this._urlTreeElements.clear();this.removeChildren();this._messageCount=0;this._updateCounter();}
name(){return this._filter.name;}
onselect(selectedByUser){this._selectedFilterSetting.set(this._filter.name);return super.onselect(selectedByUser);}
_updateCounter(){const prefix=this._messageCount?this._messageCount:Common.UIString('No');const pluralizedName=this._messageCount===1?this._filter.name:Console.ConsoleSidebar._groupPluralNameMap.get(this._filter.name);this.title=`${prefix} ${pluralizedName}`;this.setExpandable(!!this.childCount());}
onMessageAdded(viewMessage){const message=viewMessage.consoleMessage();const shouldIncrementCounter=message.type!==SDK.ConsoleMessage.MessageType.Command&&message.type!==SDK.ConsoleMessage.MessageType.Result&&!message.isGroupMessage();if(!this._filter.shouldBeVisible(viewMessage)||!shouldIncrementCounter)
return;const child=this._childElement(message.url);child.incrementAndUpdateCounter();this._messageCount++;this._updateCounter();}
_childElement(url){const urlValue=url||null;let child=this._urlTreeElements.get(urlValue);if(child)
return child;const filter=this._filter.clone();const parsedURL=urlValue?urlValue.asParsedURL():null;if(urlValue)
filter.name=parsedURL?parsedURL.displayName:urlValue;else
filter.name=Common.UIString('<other>');filter.parsedFilters.push({key:Console.ConsoleFilter.FilterType.Url,text:urlValue,negative:false});const badge=parsedURL?this._badgePool.badgeForURL(parsedURL):null;child=new Console.ConsoleSidebar.URLGroupTreeElement(filter,badge);if(urlValue)
child.tooltip=urlValue;this._urlTreeElements.set(urlValue,child);this.appendChild(child);return child;}};Console.ConsoleSidebar._groupSingularName={ConsoleAPI:Common.UIString('user message'),All:Common.UIString('message'),Error:Common.UIString('error'),Warning:Common.UIString('warning'),Info:Common.UIString('info'),Verbose:Common.UIString('verbose')};Console.ConsoleSidebar._groupPluralNameMap=new Map([[Console.ConsoleSidebar._groupSingularName.ConsoleAPI,Common.UIString('user messages')],[Console.ConsoleSidebar._groupSingularName.All,Common.UIString('messages')],[Console.ConsoleSidebar._groupSingularName.Error,Common.UIString('errors')],[Console.ConsoleSidebar._groupSingularName.Warning,Common.UIString('warnings')],[Console.ConsoleSidebar._groupSingularName.Info,Common.UIString('info')],[Console.ConsoleSidebar._groupSingularName.Verbose,Common.UIString('verbose')]]);;Console.ConsoleViewport=class{constructor(provider){this.element=createElement('div');this.element.style.overflow='auto';this._topGapElement=this.element.createChild('div');this._topGapElement.style.height='0px';this._topGapElement.style.color='transparent';this._contentElement=this.element.createChild('div');this._bottomGapElement=this.element.createChild('div');this._bottomGapElement.style.height='0px';this._bottomGapElement.style.color='transparent';this._topGapElement.textContent='\uFEFF';this._bottomGapElement.textContent='\uFEFF';UI.ARIAUtils.markAsHidden(this._topGapElement);UI.ARIAUtils.markAsHidden(this._bottomGapElement);this._provider=provider;this.element.addEventListener('scroll',this._onScroll.bind(this),false);this.element.addEventListener('copy',this._onCopy.bind(this),false);this.element.addEventListener('dragstart',this._onDragStart.bind(this),false);this._contentElement.addEventListener('focusin',this._onFocusIn.bind(this),false);this._contentElement.addEventListener('focusout',this._onFocusOut.bind(this),false);this._contentElement.addEventListener('keydown',this._onKeyDown.bind(this),false);this._virtualSelectedIndex=-1;this._contentElement.tabIndex=-1;this._firstActiveIndex=-1;this._lastActiveIndex=-1;this._renderedItems=[];this._anchorSelection=null;this._headSelection=null;this._itemCount=0;this._cumulativeHeights=new Int32Array(0);this._muteCopyHandler=false;this._observer=new MutationObserver(this.refresh.bind(this));this._observerConfig={childList:true,subtree:true};}
stickToBottom(){return this._stickToBottom;}
setStickToBottom(value){this._stickToBottom=value;if(this._stickToBottom)
this._observer.observe(this._contentElement,this._observerConfig);else
this._observer.disconnect();}
hasVirtualSelection(){return this._virtualSelectedIndex!==-1;}
copyWithStyles(){this._muteCopyHandler=true;this.element.ownerDocument.execCommand('copy');this._muteCopyHandler=false;}
_onCopy(event){if(this._muteCopyHandler)
return;const text=this._selectedText();if(!text)
return;event.preventDefault();event.clipboardData.setData('text/plain',text);}
_onFocusIn(event){const renderedIndex=this._renderedItems.findIndex(item=>item.element().isSelfOrAncestor(event.target));if(renderedIndex!==-1)
this._virtualSelectedIndex=this._firstActiveIndex+renderedIndex;let focusLastChild=false;if(this._virtualSelectedIndex===-1&&this._isOutsideViewport((event.relatedTarget))&&event.target===this._contentElement&&this._itemCount){focusLastChild=true;this._virtualSelectedIndex=this._itemCount-1;this.refresh();this.scrollItemIntoView(this._virtualSelectedIndex);}
this._updateFocusedItem(focusLastChild);}
_onFocusOut(event){if(this._isOutsideViewport((event.relatedTarget)))
this._virtualSelectedIndex=-1;this._updateFocusedItem();}
_isOutsideViewport(element){return!!element&&!element.isSelfOrDescendant(this._contentElement);}
_onDragStart(event){const text=this._selectedText();if(!text)
return false;event.dataTransfer.clearData();event.dataTransfer.setData('text/plain',text);event.dataTransfer.effectAllowed='copy';return true;}
_onKeyDown(event){if(UI.isEditing()||!this._itemCount||event.shiftKey)
return;let isArrowUp=false;switch(event.key){case'ArrowUp':if(this._virtualSelectedIndex>0){isArrowUp=true;this._virtualSelectedIndex--;}else{return;}
break;case'ArrowDown':if(this._virtualSelectedIndex<this._itemCount-1)
this._virtualSelectedIndex++;else
return;break;case'Home':this._virtualSelectedIndex=0;break;case'End':this._virtualSelectedIndex=this._itemCount-1;break;default:return;}
event.consume(true);this.scrollItemIntoView(this._virtualSelectedIndex);this._updateFocusedItem(isArrowUp);}
_updateFocusedItem(focusLastChild){const selectedElement=this.renderedElementAt(this._virtualSelectedIndex);const changed=this._lastSelectedElement!==selectedElement;const containerHasFocus=this._contentElement===this.element.ownerDocument.deepActiveElement();if(this._lastSelectedElement&&changed)
this._lastSelectedElement.classList.remove('console-selected');if(selectedElement&&(focusLastChild||changed||containerHasFocus)&&this.element.hasFocus()){selectedElement.classList.add('console-selected');if(focusLastChild){this.setStickToBottom(false);this._renderedItems[this._virtualSelectedIndex-this._firstActiveIndex].focusLastChildOrSelf();}else if(!selectedElement.hasFocus()){focusWithoutScroll(selectedElement);}}
if(this._itemCount&&!this._contentElement.hasFocus())
this._contentElement.tabIndex=0;else
this._contentElement.tabIndex=-1;this._lastSelectedElement=selectedElement;function focusWithoutScroll(element){element.focus({preventScroll:true});}}
contentElement(){return this._contentElement;}
invalidate(){delete this._cachedProviderElements;this._itemCount=this._provider.itemCount();if(this._virtualSelectedIndex>this._itemCount-1)
this._virtualSelectedIndex=this._itemCount-1;this._rebuildCumulativeHeights();this.refresh();}
_providerElement(index){if(!this._cachedProviderElements)
this._cachedProviderElements=new Array(this._itemCount);let element=this._cachedProviderElements[index];if(!element){element=this._provider.itemElement(index);this._cachedProviderElements[index]=element;}
return element;}
_rebuildCumulativeHeights(){const firstActiveIndex=this._firstActiveIndex;const lastActiveIndex=this._lastActiveIndex;let height=0;this._cumulativeHeights=new Int32Array(this._itemCount);for(let i=0;i<this._itemCount;++i){if(firstActiveIndex<=i&&i-firstActiveIndex<this._renderedItems.length&&i<=lastActiveIndex)
height+=this._renderedItems[i-firstActiveIndex].element().offsetHeight;else
height+=this._provider.fastHeight(i);this._cumulativeHeights[i]=height;}}
_rebuildCumulativeHeightsIfNeeded(){let totalCachedHeight=0;let totalMeasuredHeight=0;for(let i=0;i<this._renderedItems.length;++i){const cachedItemHeight=this._cachedItemHeight(this._firstActiveIndex+i);const measuredHeight=this._renderedItems[i].element().offsetHeight;if(Math.abs(cachedItemHeight-measuredHeight)>1){this._rebuildCumulativeHeights();return;}
totalMeasuredHeight+=measuredHeight;totalCachedHeight+=cachedItemHeight;if(Math.abs(totalCachedHeight-totalMeasuredHeight)>1){this._rebuildCumulativeHeights();return;}}}
_cachedItemHeight(index){return index===0?this._cumulativeHeights[0]:this._cumulativeHeights[index]-this._cumulativeHeights[index-1];}
_isSelectionBackwards(selection){if(!selection||!selection.rangeCount)
return false;const range=document.createRange();range.setStart(selection.anchorNode,selection.anchorOffset);range.setEnd(selection.focusNode,selection.focusOffset);return range.collapsed;}
_createSelectionModel(itemIndex,node,offset){return{item:itemIndex,node:node,offset:offset};}
_updateSelectionModel(selection){const range=selection&&selection.rangeCount?selection.getRangeAt(0):null;if(!range||selection.isCollapsed||!this.element.hasSelection()){this._headSelection=null;this._anchorSelection=null;return false;}
let firstSelected=Number.MAX_VALUE;let lastSelected=-1;let hasVisibleSelection=false;for(let i=0;i<this._renderedItems.length;++i){if(range.intersectsNode(this._renderedItems[i].element())){const index=i+this._firstActiveIndex;firstSelected=Math.min(firstSelected,index);lastSelected=Math.max(lastSelected,index);hasVisibleSelection=true;}}
if(hasVisibleSelection){firstSelected=this._createSelectionModel(firstSelected,(range.startContainer),range.startOffset);lastSelected=this._createSelectionModel(lastSelected,(range.endContainer),range.endOffset);}
const topOverlap=range.intersectsNode(this._topGapElement)&&this._topGapElement._active;const bottomOverlap=range.intersectsNode(this._bottomGapElement)&&this._bottomGapElement._active;if(!topOverlap&&!bottomOverlap&&!hasVisibleSelection){this._headSelection=null;this._anchorSelection=null;return false;}
if(!this._anchorSelection||!this._headSelection){this._anchorSelection=this._createSelectionModel(0,this.element,0);this._headSelection=this._createSelectionModel(this._itemCount-1,this.element,this.element.children.length);this._selectionIsBackward=false;}
const isBackward=this._isSelectionBackwards(selection);const startSelection=this._selectionIsBackward?this._headSelection:this._anchorSelection;const endSelection=this._selectionIsBackward?this._anchorSelection:this._headSelection;if(topOverlap&&bottomOverlap&&hasVisibleSelection){firstSelected=firstSelected.item<startSelection.item?firstSelected:startSelection;lastSelected=lastSelected.item>endSelection.item?lastSelected:endSelection;}else if(!hasVisibleSelection){firstSelected=startSelection;lastSelected=endSelection;}else if(topOverlap){firstSelected=isBackward?this._headSelection:this._anchorSelection;}else if(bottomOverlap){lastSelected=isBackward?this._anchorSelection:this._headSelection;}
if(isBackward){this._anchorSelection=lastSelected;this._headSelection=firstSelected;}else{this._anchorSelection=firstSelected;this._headSelection=lastSelected;}
this._selectionIsBackward=isBackward;return true;}
_restoreSelection(selection){let anchorElement=null;let anchorOffset;if(this._firstActiveIndex<=this._anchorSelection.item&&this._anchorSelection.item<=this._lastActiveIndex){anchorElement=this._anchorSelection.node;anchorOffset=this._anchorSelection.offset;}else{if(this._anchorSelection.item<this._firstActiveIndex)
anchorElement=this._topGapElement;else if(this._anchorSelection.item>this._lastActiveIndex)
anchorElement=this._bottomGapElement;anchorOffset=this._selectionIsBackward?1:0;}
let headElement=null;let headOffset;if(this._firstActiveIndex<=this._headSelection.item&&this._headSelection.item<=this._lastActiveIndex){headElement=this._headSelection.node;headOffset=this._headSelection.offset;}else{if(this._headSelection.item<this._firstActiveIndex)
headElement=this._topGapElement;else if(this._headSelection.item>this._lastActiveIndex)
headElement=this._bottomGapElement;headOffset=this._selectionIsBackward?0:1;}
selection.setBaseAndExtent(anchorElement,anchorOffset,headElement,headOffset);}
refresh(){this._observer.disconnect();this._innerRefresh();if(this._stickToBottom)
this._observer.observe(this._contentElement,this._observerConfig);}
_innerRefresh(){if(!this._visibleHeight())
return;if(!this._itemCount){for(let i=0;i<this._renderedItems.length;++i)
this._renderedItems[i].willHide();this._renderedItems=[];this._contentElement.removeChildren();this._topGapElement.style.height='0px';this._bottomGapElement.style.height='0px';this._firstActiveIndex=-1;this._lastActiveIndex=-1;this._updateFocusedItem();return;}
const selection=this.element.getComponentSelection();const shouldRestoreSelection=this._updateSelectionModel(selection);const visibleFrom=this.element.scrollTop;const visibleHeight=this._visibleHeight();const activeHeight=visibleHeight*2;this._rebuildCumulativeHeightsIfNeeded();if(this._stickToBottom){this._firstActiveIndex=Math.max(this._itemCount-Math.ceil(activeHeight/this._provider.minimumRowHeight()),0);this._lastActiveIndex=this._itemCount-1;}else{this._firstActiveIndex=Math.max(this._cumulativeHeights.lowerBound(visibleFrom+1-(activeHeight-visibleHeight)/2),0);this._lastActiveIndex=this._firstActiveIndex+Math.ceil(activeHeight/this._provider.minimumRowHeight())-1;this._lastActiveIndex=Math.min(this._lastActiveIndex,this._itemCount-1);}
const topGapHeight=this._cumulativeHeights[this._firstActiveIndex-1]||0;const bottomGapHeight=this._cumulativeHeights[this._cumulativeHeights.length-1]-this._cumulativeHeights[this._lastActiveIndex];function prepare(){this._topGapElement.style.height=topGapHeight+'px';this._bottomGapElement.style.height=bottomGapHeight+'px';this._topGapElement._active=!!topGapHeight;this._bottomGapElement._active=!!bottomGapHeight;this._contentElement.style.setProperty('height','10000000px');}
this._partialViewportUpdate(prepare.bind(this));this._contentElement.style.removeProperty('height');if(shouldRestoreSelection)
this._restoreSelection(selection);if(this._stickToBottom)
this.element.scrollTop=10000000;}
_partialViewportUpdate(prepare){const itemsToRender=new Set();for(let i=this._firstActiveIndex;i<=this._lastActiveIndex;++i)
itemsToRender.add(this._providerElement(i));const willBeHidden=this._renderedItems.filter(item=>!itemsToRender.has(item));for(let i=0;i<willBeHidden.length;++i)
willBeHidden[i].willHide();prepare();let hadFocus=false;for(let i=0;i<willBeHidden.length;++i){hadFocus=hadFocus||willBeHidden[i].element().hasFocus();willBeHidden[i].element().remove();}
const wasShown=[];let anchor=this._contentElement.firstChild;for(const viewportElement of itemsToRender){const element=viewportElement.element();if(element!==anchor){const shouldCallWasShown=!element.parentElement;if(shouldCallWasShown)
wasShown.push(viewportElement);this._contentElement.insertBefore(element,anchor);}else{anchor=anchor.nextSibling;}}
for(let i=0;i<wasShown.length;++i)
wasShown[i].wasShown();this._renderedItems=Array.from(itemsToRender);if(hadFocus)
this._contentElement.focus();this._updateFocusedItem();}
_selectedText(){this._updateSelectionModel(this.element.getComponentSelection());if(!this._headSelection||!this._anchorSelection)
return null;let startSelection=null;let endSelection=null;if(this._selectionIsBackward){startSelection=this._headSelection;endSelection=this._anchorSelection;}else{startSelection=this._anchorSelection;endSelection=this._headSelection;}
const textLines=[];for(let i=startSelection.item;i<=endSelection.item;++i){const element=this._providerElement(i).element();const lineContent=element.childTextNodes().map(Components.Linkifier.untruncatedNodeText).join('');textLines.push(lineContent);}
const endSelectionElement=this._providerElement(endSelection.item).element();if(endSelection.node&&endSelection.node.isSelfOrDescendant(endSelectionElement)){const itemTextOffset=this._textOffsetInNode(endSelectionElement,endSelection.node,endSelection.offset);textLines[textLines.length-1]=textLines.peekLast().substring(0,itemTextOffset);}
const startSelectionElement=this._providerElement(startSelection.item).element();if(startSelection.node&&startSelection.node.isSelfOrDescendant(startSelectionElement)){const itemTextOffset=this._textOffsetInNode(startSelectionElement,startSelection.node,startSelection.offset);textLines[0]=textLines[0].substring(itemTextOffset);}
return textLines.join('\n');}
_textOffsetInNode(itemElement,selectionNode,offset){if(selectionNode.nodeType!==Node.TEXT_NODE){if(offset<selectionNode.childNodes.length){selectionNode=(selectionNode.childNodes.item(offset));offset=0;}else{offset=selectionNode.textContent.length;}}
let chars=0;let node=itemElement;while((node=node.traverseNextNode(itemElement))&&node!==selectionNode){if(node.nodeType!==Node.TEXT_NODE||node.parentElement.nodeName==='STYLE'||node.parentElement.nodeName==='SCRIPT')
continue;chars+=Components.Linkifier.untruncatedNodeText(node).length;}
const untruncatedContainerLength=Components.Linkifier.untruncatedNodeText(selectionNode).length;if(offset>0&&untruncatedContainerLength!==selectionNode.textContent.length)
offset=untruncatedContainerLength;return chars+offset;}
_onScroll(event){this.refresh();}
firstVisibleIndex(){if(!this._cumulativeHeights.length)
return-1;this._rebuildCumulativeHeightsIfNeeded();return this._cumulativeHeights.lowerBound(this.element.scrollTop+1);}
lastVisibleIndex(){if(!this._cumulativeHeights.length)
return-1;this._rebuildCumulativeHeightsIfNeeded();const scrollBottom=this.element.scrollTop+this.element.clientHeight;const right=this._itemCount-1;return this._cumulativeHeights.lowerBound(scrollBottom,undefined,undefined,right);}
renderedElementAt(index){if(index===-1||index<this._firstActiveIndex||index>this._lastActiveIndex)
return null;return this._renderedItems[index-this._firstActiveIndex].element();}
scrollItemIntoView(index,makeLast){const firstVisibleIndex=this.firstVisibleIndex();const lastVisibleIndex=this.lastVisibleIndex();if(index>firstVisibleIndex&&index<lastVisibleIndex)
return;if(index===lastVisibleIndex&&this._cumulativeHeights[index]<=this.element.scrollTop+this._visibleHeight())
return;if(makeLast)
this.forceScrollItemToBeLast(index);else if(index<=firstVisibleIndex)
this.forceScrollItemToBeFirst(index);else if(index>=lastVisibleIndex)
this.forceScrollItemToBeLast(index);}
forceScrollItemToBeFirst(index){console.assert(index>=0&&index<this._itemCount,'Cannot scroll item at invalid index');this.setStickToBottom(false);this._rebuildCumulativeHeightsIfNeeded();this.element.scrollTop=index>0?this._cumulativeHeights[index-1]:0;if(this.element.isScrolledToBottom())
this.setStickToBottom(true);this.refresh();this.renderedElementAt(index).scrollIntoView(true);}
forceScrollItemToBeLast(index){console.assert(index>=0&&index<this._itemCount,'Cannot scroll item at invalid index');this.setStickToBottom(false);this._rebuildCumulativeHeightsIfNeeded();this.element.scrollTop=this._cumulativeHeights[index]-this._visibleHeight();if(this.element.isScrolledToBottom())
this.setStickToBottom(true);this.refresh();this.renderedElementAt(index).scrollIntoView(false);}
_visibleHeight(){return this.element.offsetHeight;}};Console.ConsoleViewportProvider=function(){};Console.ConsoleViewportProvider.prototype={fastHeight(index){return 0;},itemCount(){return 0;},minimumRowHeight(){return 0;},itemElement(index){return null;}};Console.ConsoleViewportElement=function(){};Console.ConsoleViewportElement.prototype={willHide(){},wasShown(){},element(){},};;Console.ConsoleViewMessage=class{constructor(consoleMessage,linkifier,badgePool,nestingLevel,onResize){this._message=consoleMessage;this._linkifier=linkifier;this._badgePool=badgePool;this._repeatCount=1;this._closeGroupDecorationCount=0;this._nestingLevel=nestingLevel;this._selectableChildren=[];this._messageResized=onResize;this._dataGrid=null;this._previewFormatter=new ObjectUI.RemoteObjectPreviewFormatter();this._searchRegex=null;this._messageLevelIcon=null;this._traceExpanded=false;this._expandTrace=null;}
element(){return this.toMessageElement();}
wasShown(){if(this._dataGrid)
this._dataGrid.updateWidths();this._isVisible=true;}
onResize(){if(!this._isVisible)
return;if(this._dataGrid)
this._dataGrid.onResize();}
willHide(){this._isVisible=false;this._cachedHeight=this.element().offsetHeight;}
fastHeight(){if(this._cachedHeight)
return this._cachedHeight;const defaultConsoleRowHeight=19;if(this._message.type===SDK.ConsoleMessage.MessageType.Table){const table=this._message.parameters[0];if(table&&table.preview)
return defaultConsoleRowHeight*table.preview.properties.length;}
return defaultConsoleRowHeight;}
consoleMessage(){return this._message;}
_buildTableMessage(){const formattedMessage=createElementWithClass('span','source-code');this._anchorElement=this._buildMessageAnchor();if(this._anchorElement)
formattedMessage.appendChild(this._anchorElement);const badgeElement=this._buildMessageBadge();if(badgeElement)
formattedMessage.appendChild(badgeElement);let table=this._message.parameters&&this._message.parameters.length?this._message.parameters[0]:null;if(table)
table=this._parameterToRemoteObject(table);if(!table||!table.preview)
return this._buildMessage();const rawValueColumnSymbol=Symbol('rawValueColumn');const columnNames=[];const preview=table.preview;const rows=[];for(let i=0;i<preview.properties.length;++i){const rowProperty=preview.properties[i];let rowSubProperties;if(rowProperty.valuePreview)
rowSubProperties=rowProperty.valuePreview.properties;else if(rowProperty.value)
rowSubProperties=[{name:rawValueColumnSymbol,type:rowProperty.type,value:rowProperty.value}];else
continue;const rowValue={};const maxColumnsToRender=20;for(let j=0;j<rowSubProperties.length;++j){const cellProperty=rowSubProperties[j];let columnRendered=columnNames.indexOf(cellProperty.name)!==-1;if(!columnRendered){if(columnNames.length===maxColumnsToRender)
continue;columnRendered=true;columnNames.push(cellProperty.name);}
if(columnRendered){const cellElement=this._renderPropertyPreviewOrAccessor(table,[rowProperty,cellProperty]);cellElement.classList.add('console-message-nowrap-below');rowValue[cellProperty.name]=cellElement;}}
rows.push([rowProperty.name,rowValue]);}
const flatValues=[];for(let i=0;i<rows.length;++i){const rowName=rows[i][0];const rowValue=rows[i][1];flatValues.push(rowName);for(let j=0;j<columnNames.length;++j)
flatValues.push(rowValue[columnNames[j]]);}
columnNames.unshift(Common.UIString('(index)'));const columnDisplayNames=columnNames.map(name=>name===rawValueColumnSymbol?Common.UIString('Value'):name);if(flatValues.length){this._dataGrid=DataGrid.SortableDataGrid.create(columnDisplayNames,flatValues);this._dataGrid.setStriped(true);const formattedResult=createElementWithClass('span','console-message-text');const tableElement=formattedResult.createChild('div','console-message-formatted-table');const dataGridContainer=tableElement.createChild('span');tableElement.appendChild(this._formatParameter(table,true,false));dataGridContainer.appendChild(this._dataGrid.element);formattedMessage.appendChild(formattedResult);this._dataGrid.renderInline();}
return formattedMessage;}
_buildMessage(){let messageElement;let messageText=this._message.messageText;if(this._message.source===SDK.ConsoleMessage.MessageSource.ConsoleAPI){switch(this._message.type){case SDK.ConsoleMessage.MessageType.Trace:messageElement=this._format(this._message.parameters||['console.trace']);break;case SDK.ConsoleMessage.MessageType.Clear:messageElement=createElementWithClass('span','console-info');if(Common.moduleSetting('preserveConsoleLog').get())
messageElement.textContent=Common.UIString('console.clear() was prevented due to \'Preserve log\'');else
messageElement.textContent=Common.UIString('Console was cleared');messageElement.title=ls`Clear all messages with ${UI.shortcutRegistry.shortcutTitleForAction('console.clear')}`;break;case SDK.ConsoleMessage.MessageType.Dir:{const obj=this._message.parameters?this._message.parameters[0]:undefined;const args=['%O',obj];messageElement=this._format(args);break;}
case SDK.ConsoleMessage.MessageType.Profile:case SDK.ConsoleMessage.MessageType.ProfileEnd:messageElement=this._format([messageText]);break;case SDK.ConsoleMessage.MessageType.Assert:this._messagePrefix=ls`Assertion failed: `;default:{if(this._message.parameters&&this._message.parameters.length===1&&this._message.parameters[0].type==='string')
messageElement=this._tryFormatAsError((this._message.parameters[0].value));const args=this._message.parameters||[messageText];messageElement=messageElement||this._format(args);}}}else{if(this._message.source===SDK.ConsoleMessage.MessageSource.Network){messageElement=this._formatAsNetworkRequest()||this._format([messageText]);}else{const messageInParameters=this._message.parameters&&messageText===(this._message.parameters[0]);if(this._message.source===SDK.ConsoleMessage.MessageSource.Violation)
messageText=Common.UIString('[Violation] %s',messageText);else if(this._message.source===SDK.ConsoleMessage.MessageSource.Intervention)
messageText=Common.UIString('[Intervention] %s',messageText);else if(this._message.source===SDK.ConsoleMessage.MessageSource.Deprecation)
messageText=Common.UIString('[Deprecation] %s',messageText);const args=this._message.parameters||[messageText];if(messageInParameters)
args[0]=messageText;messageElement=this._format(args);}}
messageElement.classList.add('console-message-text');const formattedMessage=createElementWithClass('span','source-code');this._anchorElement=this._buildMessageAnchor();if(this._anchorElement)
formattedMessage.appendChild(this._anchorElement);const badgeElement=this._buildMessageBadge();if(badgeElement)
formattedMessage.appendChild(badgeElement);formattedMessage.appendChild(messageElement);return formattedMessage;}
_formatAsNetworkRequest(){const request=SDK.NetworkLog.requestForConsoleMessage(this._message);if(!request)
return null;const messageElement=createElement('span');if(this._message.level===SDK.ConsoleMessage.MessageLevel.Error){messageElement.createTextChild(request.requestMethod+' ');const linkElement=Components.Linkifier.linkifyRevealable(request,request.url(),request.url());linkElement.tabIndex=-1;this._selectableChildren.push({element:linkElement,forceSelect:()=>linkElement.focus()});messageElement.appendChild(linkElement);if(request.failed)
messageElement.createTextChildren(' ',request.localizedFailDescription);if(request.statusCode!==0)
messageElement.createTextChildren(' ',String(request.statusCode));if(request.statusText)
messageElement.createTextChildren(' (',request.statusText,')');}else{const messageText=this._message.messageText;const fragment=this._linkifyWithCustomLinkifier(messageText,(text,url,lineNumber,columnNumber)=>{let linkElement;if(url===request.url()){linkElement=Components.Linkifier.linkifyRevealable((request),url,request.url());}else{linkElement=Components.Linkifier.linkifyURL(url,{text,lineNumber,columnNumber});}
linkElement.tabIndex=-1;this._selectableChildren.push({element:linkElement,forceSelect:()=>linkElement.focus()});return linkElement;});messageElement.appendChild(fragment);}
return messageElement;}
_buildMessageAnchor(){let anchorElement=null;if(this._message.scriptId){anchorElement=this._linkifyScriptId(this._message.scriptId,this._message.url||'',this._message.line,this._message.column);}else if(this._message.stackTrace&&this._message.stackTrace.callFrames.length){anchorElement=this._linkifyStackTraceTopFrame(this._message.stackTrace);}else if(this._message.url&&this._message.url!=='undefined'){anchorElement=this._linkifyLocation(this._message.url,this._message.line,this._message.column);}
if(anchorElement){const anchorWrapperElement=createElementWithClass('span','console-message-anchor');anchorWrapperElement.appendChild(anchorElement);anchorWrapperElement.createTextChild(' ');return anchorWrapperElement;}
return null;}
_buildMessageBadge(){const badgeElement=this._badgeElement();if(!badgeElement)
return null;badgeElement.classList.add('console-message-badge');return badgeElement;}
_badgeElement(){if(this._message._url)
return this._badgePool.badgeForURL(new Common.ParsedURL(this._message._url));if(this._message.stackTrace){let stackTrace=this._message.stackTrace;while(stackTrace){for(const callFrame of this._message.stackTrace.callFrames){if(callFrame.url)
return this._badgePool.badgeForURL(new Common.ParsedURL(callFrame.url));}
stackTrace=stackTrace.parent;}}
if(!this._message.executionContextId)
return null;const runtimeModel=this._message.runtimeModel();if(!runtimeModel)
return null;const executionContext=runtimeModel.executionContext(this._message.executionContextId);if(!executionContext||!executionContext.frameId)
return null;const resourceTreeModel=executionContext.target().model(SDK.ResourceTreeModel);if(!resourceTreeModel)
return null;const frame=resourceTreeModel.frameForId(executionContext.frameId);if(!frame||!frame.parentFrame)
return null;return this._badgePool.badgeForFrame(frame);}
_buildMessageWithStackTrace(){const toggleElement=createElementWithClass('div','console-message-stack-trace-toggle');const contentElement=toggleElement.createChild('div','console-message-stack-trace-wrapper');const messageElement=this._buildMessage();const icon=UI.Icon.create('smallicon-triangle-right','console-message-expand-icon');const clickableElement=contentElement.createChild('div');clickableElement.appendChild(icon);clickableElement.tabIndex=-1;clickableElement.appendChild(messageElement);const stackTraceElement=contentElement.createChild('div');const stackTracePreview=Components.JSPresentationUtils.buildStackTracePreviewContents(this._message.runtimeModel().target(),this._linkifier,this._message.stackTrace);stackTraceElement.appendChild(stackTracePreview.element);for(const linkElement of stackTracePreview.links){linkElement.tabIndex=-1;this._selectableChildren.push({element:linkElement,forceSelect:()=>linkElement.focus()});}
stackTraceElement.classList.add('hidden');this._expandTrace=expand=>{icon.setIconType(expand?'smallicon-triangle-down':'smallicon-triangle-right');stackTraceElement.classList.toggle('hidden',!expand);this._traceExpanded=expand;};function toggleStackTrace(event){if(UI.isEditing()||contentElement.hasSelection())
return;this._expandTrace(stackTraceElement.classList.contains('hidden'));event.consume();}
clickableElement.addEventListener('click',toggleStackTrace.bind(this),false);if(this._message.type===SDK.ConsoleMessage.MessageType.Trace)
this._expandTrace(true);toggleElement._expandStackTraceForTest=this._expandTrace.bind(this,true);return toggleElement;}
_linkifyLocation(url,lineNumber,columnNumber){if(!this._message.runtimeModel())
return null;return this._linkifier.linkifyScriptLocation(this._message.runtimeModel().target(),null,url,lineNumber,columnNumber);}
_linkifyStackTraceTopFrame(stackTrace){if(!this._message.runtimeModel())
return null;return this._linkifier.linkifyStackTraceTopFrame(this._message.runtimeModel().target(),stackTrace);}
_linkifyScriptId(scriptId,url,lineNumber,columnNumber){if(!this._message.runtimeModel())
return null;return this._linkifier.linkifyScriptLocation(this._message.runtimeModel().target(),scriptId,url,lineNumber,columnNumber);}
_parameterToRemoteObject(parameter){if(parameter instanceof SDK.RemoteObject)
return parameter;const runtimeModel=this._message.runtimeModel();if(!runtimeModel)
return SDK.RemoteObject.fromLocalObject(parameter);if(typeof parameter==='object')
return runtimeModel.createRemoteObject(parameter);return runtimeModel.createRemoteObjectFromPrimitiveValue(parameter);}
_format(rawParameters){const formattedResult=createElement('span');if(this._messagePrefix)
formattedResult.createChild('span').textContent=this._messagePrefix;if(!rawParameters.length)
return formattedResult;let parameters=[];for(let i=0;i<rawParameters.length;++i)
parameters[i]=this._parameterToRemoteObject(rawParameters[i]);const shouldFormatMessage=SDK.RemoteObject.type(((parameters))[0])==='string'&&(this._message.type!==SDK.ConsoleMessage.MessageType.Result||this._message.level===SDK.ConsoleMessage.MessageLevel.Error);if(shouldFormatMessage){const result=this._formatWithSubstitutionString((parameters[0].description),parameters.slice(1),formattedResult);parameters=result.unusedSubstitutions;if(parameters.length)
formattedResult.createTextChild(' ');}
for(let i=0;i<parameters.length;++i){if(shouldFormatMessage&&parameters[i].type==='string')
formattedResult.appendChild(this._linkifyStringAsFragment(parameters[i].description));else
formattedResult.appendChild(this._formatParameter(parameters[i],false,true));if(i<parameters.length-1)
formattedResult.createTextChild(' ');}
return formattedResult;}
_formatParameter(output,forceObjectFormat,includePreview){if(output.customPreview())
return(new ObjectUI.CustomPreviewComponent(output)).element;const type=forceObjectFormat?'object':(output.subtype||output.type);let element;switch(type){case'error':element=this._formatParameterAsError(output);break;case'function':element=this._formatParameterAsFunction(output,includePreview);break;case'array':case'arraybuffer':case'blob':case'dataview':case'generator':case'iterator':case'map':case'object':case'promise':case'proxy':case'set':case'typedarray':case'weakmap':case'weakset':element=this._formatParameterAsObject(output,includePreview);break;case'node':element=output.isNode()?this._formatParameterAsNode(output):this._formatParameterAsObject(output,false);break;case'string':element=this._formatParameterAsString(output);break;case'boolean':case'date':case'null':case'number':case'regexp':case'symbol':case'undefined':case'bigint':element=this._formatParameterAsValue(output);break;default:element=this._formatParameterAsValue(output);console.error('Tried to format remote object of unknown type.');}
element.classList.add('object-value-'+type);element.classList.add('source-code');return element;}
_formatParameterAsValue(obj){const result=createElement('span');const description=obj.description||'';if(description.length>Console.ConsoleViewMessage._MaxTokenizableStringLength)
result.appendChild(UI.createExpandableText(description,Console.ConsoleViewMessage._LongStringVisibleLength));else
result.createTextChild(description);if(obj.objectId)
result.addEventListener('contextmenu',this._contextMenuEventFired.bind(this,obj),false);return result;}
_formatParameterAsObject(obj,includePreview){const titleElement=createElementWithClass('span','console-object');if(includePreview&&obj.preview){titleElement.classList.add('console-object-preview');this._previewFormatter.appendObjectPreview(titleElement,obj.preview,false);}else if(obj.type==='function'){const functionElement=titleElement.createChild('span');ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(obj,functionElement,false);titleElement.classList.add('object-value-function');}else{titleElement.createTextChild(obj.description||'');}
if(!obj.hasChildren||obj.customPreview())
return titleElement;const note=titleElement.createChild('span','object-state-note info-note');if(this._message.type===SDK.ConsoleMessage.MessageType.QueryObjectResult)
note.title=ls`This value will not be collected until console is cleared.`;else
note.title=ls`Value below was evaluated just now.`;const section=new ObjectUI.ObjectPropertiesSection(obj,titleElement,this._linkifier);section.element.classList.add('console-view-object-properties-section');section.enableContextMenu();section.setShowSelectionOnKeyboardFocus(true,true);this._selectableChildren.push(section);section.addEventListener(UI.TreeOutline.Events.ElementAttached,this._messageResized);section.addEventListener(UI.TreeOutline.Events.ElementExpanded,this._messageResized);section.addEventListener(UI.TreeOutline.Events.ElementCollapsed,this._messageResized);return section.element;}
_formatParameterAsFunction(func,includePreview){const result=createElement('span');SDK.RemoteFunction.objectAsFunction(func).targetFunction().then(formatTargetFunction.bind(this));return result;function formatTargetFunction(targetFunction){const functionElement=createElement('span');const promise=ObjectUI.ObjectPropertiesSection.formatObjectAsFunction(targetFunction,functionElement,true,includePreview);result.appendChild(functionElement);if(targetFunction!==func){const note=result.createChild('span','object-info-state-note');note.title=Common.UIString('Function was resolved from bound function.');}
result.addEventListener('contextmenu',this._contextMenuEventFired.bind(this,targetFunction),false);promise.then(()=>this._formattedParameterAsFunctionForTest());}}
_formattedParameterAsFunctionForTest(){}
_contextMenuEventFired(obj,event){const contextMenu=new UI.ContextMenu(event);contextMenu.appendApplicableItems(obj);contextMenu.show();}
_renderPropertyPreviewOrAccessor(object,propertyPath){const property=propertyPath.peekLast();if(property.type==='accessor')
return this._formatAsAccessorProperty(object,propertyPath.map(property=>property.name),false);return this._previewFormatter.renderPropertyPreview(property.type,(property.subtype),property.value);}
_formatParameterAsNode(remoteObject){const result=createElement('span');const domModel=remoteObject.runtimeModel().target().model(SDK.DOMModel);if(!domModel)
return result;domModel.pushObjectAsNodeToFrontend(remoteObject).then(async node=>{if(!node){result.appendChild(this._formatParameterAsObject(remoteObject,false));return;}
const renderResult=await UI.Renderer.render((node));if(renderResult){if(renderResult.tree){this._selectableChildren.push(renderResult.tree);renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementAttached,this._messageResized);renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementExpanded,this._messageResized);renderResult.tree.addEventListener(UI.TreeOutline.Events.ElementCollapsed,this._messageResized);}
result.appendChild(renderResult.node);}else{result.appendChild(this._formatParameterAsObject(remoteObject,false));}
this._formattedParameterAsNodeForTest();});return result;}
_formattedParameterAsNodeForTest(){}
_formatParameterAsString(output){const span=createElement('span');span.appendChild(this._linkifyStringAsFragment(output.description||''));const result=createElement('span');result.createChild('span','object-value-string-quote').textContent='"';result.appendChild(span);result.createChild('span','object-value-string-quote').textContent='"';return result;}
_formatParameterAsError(output){const result=createElement('span');const errorSpan=this._tryFormatAsError(output.description||'');result.appendChild(errorSpan?errorSpan:this._linkifyStringAsFragment(output.description||''));return result;}
_formatAsArrayEntry(output){return this._previewFormatter.renderPropertyPreview(output.type,output.subtype,output.description);}
_formatAsAccessorProperty(object,propertyPath,isArrayEntry){const rootElement=ObjectUI.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(object,propertyPath,onInvokeGetterClick.bind(this));function onInvokeGetterClick(result){const wasThrown=result.wasThrown;const object=result.object;if(!object)
return;rootElement.removeChildren();if(wasThrown){const element=rootElement.createChild('span');element.textContent=Common.UIString('<exception>');element.title=(object.description);}else if(isArrayEntry){rootElement.appendChild(this._formatAsArrayEntry(object));}else{const maxLength=100;const type=object.type;const subtype=object.subtype;let description='';if(type!=='function'&&object.description){if(type==='string'||subtype==='regexp')
description=object.description.trimMiddle(maxLength);else
description=object.description.trimEnd(maxLength);}
rootElement.appendChild(this._previewFormatter.renderPropertyPreview(type,subtype,description));}}
return rootElement;}
_formatWithSubstitutionString(format,parameters,formattedResult){const formatters={};function parameterFormatter(force,includePreview,obj){return this._formatParameter(obj,force,includePreview);}
function stringFormatter(obj){return obj.description;}
function floatFormatter(obj){if(typeof obj.value!=='number')
return'NaN';return obj.value;}
function integerFormatter(obj){if(obj.type==='bigint')
return obj.description;if(typeof obj.value!=='number')
return'NaN';return Math.floor(obj.value);}
function bypassFormatter(obj){return(obj instanceof Node)?obj:'';}
let currentStyle=null;function styleFormatter(obj){currentStyle={};const buffer=createElement('span');buffer.setAttribute('style',obj.description);for(let i=0;i<buffer.style.length;i++){const property=buffer.style[i];if(isWhitelistedProperty(property))
currentStyle[property]=buffer.style[property];}}
function isWhitelistedProperty(property){const prefixes=['background','border','color','font','line','margin','padding','text','-webkit-background','-webkit-border','-webkit-font','-webkit-margin','-webkit-padding','-webkit-text'];for(let i=0;i<prefixes.length;i++){if(property.startsWith(prefixes[i]))
return true;}
return false;}
formatters.o=parameterFormatter.bind(this,false,true);formatters.s=stringFormatter;formatters.f=floatFormatter;formatters.i=integerFormatter;formatters.d=integerFormatter;formatters.c=styleFormatter;formatters.O=parameterFormatter.bind(this,true,false);formatters._=bypassFormatter;function append(a,b){if(b instanceof Node){a.appendChild(b);return a;}
if(typeof b==='undefined')
return a;if(!currentStyle){a.appendChild(this._linkifyStringAsFragment(String(b)));return a;}
const lines=String(b).split('\n');for(let i=0;i<lines.length;i++){const line=lines[i];const lineFragment=this._linkifyStringAsFragment(line);const wrapper=createElement('span');wrapper.style.setProperty('contain','paint');wrapper.style.setProperty('display','inline-block');wrapper.style.setProperty('max-width','100%');wrapper.appendChild(lineFragment);applyCurrentStyle(wrapper);for(const child of wrapper.children){if(child.classList.contains('devtools-link'))
this._applyForcedVisibleStyle(child);}
a.appendChild(wrapper);if(i<lines.length-1)
a.appendChild(createElement('br'));}
return a;}
function applyCurrentStyle(element){for(const key in currentStyle)
element.style[key]=currentStyle[key];}
return String.format(format,parameters,formatters,formattedResult,append.bind(this));}
_applyForcedVisibleStyle(element){element.style.setProperty('-webkit-text-stroke','0','important');element.style.setProperty('text-decoration','underline','important');const themedColor=UI.themeSupport.patchColorText('rgb(33%, 33%, 33%)',UI.ThemeSupport.ColorUsage.Foreground);element.style.setProperty('color',themedColor,'important');let backgroundColor='hsl(0, 0%, 100%)';if(this._message.level===SDK.ConsoleMessage.MessageLevel.Error)
backgroundColor='hsl(0, 100%, 97%)';else if(this._message.level===SDK.ConsoleMessage.MessageLevel.Warning||this._shouldRenderAsWarning())
backgroundColor='hsl(50, 100%, 95%)';const themedBackgroundColor=UI.themeSupport.patchColorText(backgroundColor,UI.ThemeSupport.ColorUsage.Background);element.style.setProperty('background-color',themedBackgroundColor,'important');}
matchesFilterRegex(regexObject){regexObject.lastIndex=0;const contentElement=this.contentElement();const anchorText=this._anchorElement?this._anchorElement.deepTextContent():'';return(anchorText&&regexObject.test(anchorText.trim()))||regexObject.test(contentElement.deepTextContent().slice(anchorText.length));}
matchesFilterText(filter){const text=this.contentElement().deepTextContent();return text.toLowerCase().includes(filter.toLowerCase());}
updateTimestamp(){if(!this._contentElement)
return;if(Common.moduleSetting('consoleTimestampsEnabled').get()){if(!this._timestampElement)
this._timestampElement=createElementWithClass('span','console-timestamp');this._timestampElement.textContent=UI.formatTimestamp(this._message.timestamp,false)+' ';this._timestampElement.title=UI.formatTimestamp(this._message.timestamp,true);this._contentElement.insertBefore(this._timestampElement,this._contentElement.firstChild);}else if(this._timestampElement){this._timestampElement.remove();delete this._timestampElement;}}
nestingLevel(){return this._nestingLevel;}
setInSimilarGroup(inSimilarGroup,isLast){this._inSimilarGroup=inSimilarGroup;this._lastInSimilarGroup=inSimilarGroup&&!!isLast;if(this._similarGroupMarker&&!inSimilarGroup){this._similarGroupMarker.remove();this._similarGroupMarker=null;}else if(this._element&&!this._similarGroupMarker&&inSimilarGroup){this._similarGroupMarker=createElementWithClass('div','nesting-level-marker');this._element.insertBefore(this._similarGroupMarker,this._element.firstChild);this._similarGroupMarker.classList.toggle('group-closed',this._lastInSimilarGroup);}}
isLastInSimilarGroup(){return this._inSimilarGroup&&this._lastInSimilarGroup;}
resetCloseGroupDecorationCount(){if(!this._closeGroupDecorationCount)
return;this._closeGroupDecorationCount=0;this._updateCloseGroupDecorations();}
incrementCloseGroupDecorationCount(){++this._closeGroupDecorationCount;this._updateCloseGroupDecorations();}
_updateCloseGroupDecorations(){if(!this._nestingLevelMarkers)
return;for(let i=0,n=this._nestingLevelMarkers.length;i<n;++i){const marker=this._nestingLevelMarkers[i];marker.classList.toggle('group-closed',n-i<=this._closeGroupDecorationCount);}}
_focusedChildIndex(){if(!this._selectableChildren.length)
return-1;return this._selectableChildren.findIndex(child=>child.element.hasFocus());}
_onKeyDown(event){if(UI.isEditing()||!this._element.hasFocus()||this._element.hasSelection())
return;if(this.maybeHandleOnKeyDown(event))
event.consume(true);}
maybeHandleOnKeyDown(event){const focusedChildIndex=this._focusedChildIndex();const isWrapperFocused=focusedChildIndex===-1;if(this._expandTrace&&isWrapperFocused){if((event.key==='ArrowLeft'&&this._traceExpanded)||(event.key==='ArrowRight'&&!this._traceExpanded)){this._expandTrace(!this._traceExpanded);return true;}}
if(!this._selectableChildren.length)
return false;if(event.key==='ArrowLeft'){this._element.focus();return true;}
if(event.key==='ArrowRight'){if(isWrapperFocused&&this._selectNearestVisibleChild(0))
return true;}
if(event.key==='ArrowUp'){const firstVisibleChild=this._nearestVisibleChild(0);if(this._selectableChildren[focusedChildIndex]===firstVisibleChild&&firstVisibleChild){this._element.focus();return true;}else if(this._selectNearestVisibleChild(focusedChildIndex-1,true)){return true;}}
if(event.key==='ArrowDown'){if(isWrapperFocused&&this._selectNearestVisibleChild(0))
return true;if(!isWrapperFocused&&this._selectNearestVisibleChild(focusedChildIndex+1))
return true;}
return false;}
_selectNearestVisibleChild(fromIndex,backwards){const nearestChild=this._nearestVisibleChild(fromIndex,backwards);if(nearestChild){nearestChild.forceSelect();return true;}
return false;}
_nearestVisibleChild(fromIndex,backwards){const childCount=this._selectableChildren.length;if(fromIndex<0||fromIndex>=childCount)
return null;const direction=backwards?-1:1;let index=fromIndex;while(!this._selectableChildren[index].element.offsetParent){index+=direction;if(index<0||index>=childCount)
return null;}
return this._selectableChildren[index];}
focusLastChildOrSelf(){if(this._element&&!this._selectNearestVisibleChild(this._selectableChildren.length-1,true))
this._element.focus();}
contentElement(){if(this._contentElement)
return this._contentElement;const contentElement=createElementWithClass('div','console-message');if(this._messageLevelIcon)
contentElement.appendChild(this._messageLevelIcon);this._contentElement=contentElement;let formattedMessage;const shouldIncludeTrace=!!this._message.stackTrace&&(this._message.source===SDK.ConsoleMessage.MessageSource.Network||this._message.source===SDK.ConsoleMessage.MessageSource.Violation||this._message.level===SDK.ConsoleMessage.MessageLevel.Error||this._message.level===SDK.ConsoleMessage.MessageLevel.Warning||this._message.type===SDK.ConsoleMessage.MessageType.Trace);if(this._message.runtimeModel()&&shouldIncludeTrace)
formattedMessage=this._buildMessageWithStackTrace();else if(this._message.type===SDK.ConsoleMessage.MessageType.Table)
formattedMessage=this._buildTableMessage();else
formattedMessage=this._buildMessage();contentElement.appendChild(formattedMessage);this.updateTimestamp();return this._contentElement;}
toMessageElement(){if(this._element)
return this._element;this._element=createElement('div');this._element.tabIndex=-1;this._element.addEventListener('keydown',this._onKeyDown.bind(this));this.updateMessageElement();return this._element;}
updateMessageElement(){if(!this._element)
return;this._element.className='console-message-wrapper';this._element.removeChildren();if(this._message.isGroupStartMessage())
this._element.classList.add('console-group-title');if(this._message.source===SDK.ConsoleMessage.MessageSource.ConsoleAPI)
this._element.classList.add('console-from-api');if(this._inSimilarGroup){this._similarGroupMarker=this._element.createChild('div','nesting-level-marker');this._similarGroupMarker.classList.toggle('group-closed',this._lastInSimilarGroup);}
this._nestingLevelMarkers=[];for(let i=0;i<this._nestingLevel;++i)
this._nestingLevelMarkers.push(this._element.createChild('div','nesting-level-marker'));this._updateCloseGroupDecorations();this._element.message=this;switch(this._message.level){case SDK.ConsoleMessage.MessageLevel.Verbose:this._element.classList.add('console-verbose-level');break;case SDK.ConsoleMessage.MessageLevel.Info:this._element.classList.add('console-info-level');if(this._message.type===SDK.ConsoleMessage.MessageType.System)
this._element.classList.add('console-system-type');break;case SDK.ConsoleMessage.MessageLevel.Warning:this._element.classList.add('console-warning-level');break;case SDK.ConsoleMessage.MessageLevel.Error:this._element.classList.add('console-error-level');break;}
this._updateMessageLevelIcon();if(this._shouldRenderAsWarning())
this._element.classList.add('console-warning-level');this._element.appendChild(this.contentElement());if(this._repeatCount>1)
this._showRepeatCountElement();}
_shouldRenderAsWarning(){return(this._message.level===SDK.ConsoleMessage.MessageLevel.Verbose||this._message.level===SDK.ConsoleMessage.MessageLevel.Info)&&(this._message.source===SDK.ConsoleMessage.MessageSource.Violation||this._message.source===SDK.ConsoleMessage.MessageSource.Deprecation||this._message.source===SDK.ConsoleMessage.MessageSource.Intervention||this._message.source===SDK.ConsoleMessage.MessageSource.Recommendation);}
_updateMessageLevelIcon(){let iconType='';let accessibleName='';if(this._message.level===SDK.ConsoleMessage.MessageLevel.Warning){iconType='smallicon-warning';accessibleName=ls`Warning`;}else if(this._message.level===SDK.ConsoleMessage.MessageLevel.Error){iconType='smallicon-error';accessibleName=ls`Error`;}
if(!iconType&&!this._messageLevelIcon)
return;if(iconType&&!this._messageLevelIcon){this._messageLevelIcon=UI.Icon.create('','message-level-icon');if(this._contentElement)
this._contentElement.insertBefore(this._messageLevelIcon,this._contentElement.firstChild);}
this._messageLevelIcon.setIconType(iconType);UI.ARIAUtils.setAccessibleName(this._messageLevelIcon,accessibleName);}
repeatCount(){return this._repeatCount||1;}
resetIncrementRepeatCount(){this._repeatCount=1;if(!this._repeatCountElement)
return;this._repeatCountElement.remove();if(this._contentElement)
this._contentElement.classList.remove('repeated-message');delete this._repeatCountElement;}
incrementRepeatCount(){this._repeatCount++;this._showRepeatCountElement();}
setRepeatCount(repeatCount){this._repeatCount=repeatCount;this._showRepeatCountElement();}
_showRepeatCountElement(){if(!this._element)
return;if(!this._repeatCountElement){this._repeatCountElement=createElementWithClass('span','console-message-repeat-count','dt-small-bubble');switch(this._message.level){case SDK.ConsoleMessage.MessageLevel.Warning:this._repeatCountElement.type='warning';break;case SDK.ConsoleMessage.MessageLevel.Error:this._repeatCountElement.type='error';break;case SDK.ConsoleMessage.MessageLevel.Verbose:this._repeatCountElement.type='verbose';break;default:this._repeatCountElement.type='info';}
if(this._shouldRenderAsWarning())
this._repeatCountElement.type='warning';this._element.insertBefore(this._repeatCountElement,this._contentElement);this._contentElement.classList.add('repeated-message');}
this._repeatCountElement.textContent=this._repeatCount;let accessibleName=ls`Repeat ${this._repeatCount}`;if(this._message.level===SDK.ConsoleMessage.MessageLevel.Warning)
accessibleName=ls`Warning ${accessibleName}`;else if(this._message.level===SDK.ConsoleMessage.MessageLevel.Error)
accessibleName=ls`Error ${accessibleName}`;UI.ARIAUtils.setAccessibleName(this._repeatCountElement,accessibleName);}
get text(){return this._message.messageText;}
toExportString(){const lines=[];const nodes=this.contentElement().childTextNodes();const messageContent=nodes.map(Components.Linkifier.untruncatedNodeText).join('');for(let i=0;i<this.repeatCount();++i)
lines.push(messageContent);return lines.join('\n');}
setSearchRegex(regex){if(this._searchHiglightNodeChanges&&this._searchHiglightNodeChanges.length)
UI.revertDomChanges(this._searchHiglightNodeChanges);this._searchRegex=regex;this._searchHighlightNodes=[];this._searchHiglightNodeChanges=[];if(!this._searchRegex)
return;const text=this.contentElement().deepTextContent();let match;this._searchRegex.lastIndex=0;const sourceRanges=[];while((match=this._searchRegex.exec(text))&&match[0])
sourceRanges.push(new TextUtils.SourceRange(match.index,match[0].length));if(sourceRanges.length){this._searchHighlightNodes=UI.highlightSearchResults(this.contentElement(),sourceRanges,this._searchHiglightNodeChanges);}}
searchRegex(){return this._searchRegex;}
searchCount(){return this._searchHighlightNodes.length;}
searchHighlightNode(index){return this._searchHighlightNodes[index];}
_tryFormatAsError(string){function startsWith(prefix){return string.startsWith(prefix);}
const errorPrefixes=['EvalError','ReferenceError','SyntaxError','TypeError','RangeError','Error','URIError'];if(!this._message.runtimeModel()||!errorPrefixes.some(startsWith))
return null;const debuggerModel=this._message.runtimeModel().debuggerModel();const baseURL=this._message.runtimeModel().target().inspectedURL();const lines=string.split('\n');const links=[];let position=0;for(let i=0;i<lines.length;++i){position+=i>0?lines[i-1].length+1:0;const isCallFrameLine=/^\s*at\s/.test(lines[i]);if(!isCallFrameLine&&links.length)
return null;if(!isCallFrameLine)
continue;let openBracketIndex=-1;let closeBracketIndex=-1;const inBracketsWithLineAndColumn=/\([^\)\(]+:\d+:\d+\)/g;const inBrackets=/\([^\)\(]+\)/g;let lastMatch=null;let currentMatch;while((currentMatch=inBracketsWithLineAndColumn.exec(lines[i])))
lastMatch=currentMatch;if(!lastMatch){while((currentMatch=inBrackets.exec(lines[i])))
lastMatch=currentMatch;}
if(lastMatch){openBracketIndex=lastMatch.index;closeBracketIndex=lastMatch.index+lastMatch[0].length-1;}
const hasOpenBracket=openBracketIndex!==-1;const left=hasOpenBracket?openBracketIndex+1:lines[i].indexOf('at')+3;const right=hasOpenBracket?closeBracketIndex:lines[i].length;const linkCandidate=lines[i].substring(left,right);const splitResult=Common.ParsedURL.splitLineAndColumn(linkCandidate);if(!splitResult)
return null;if(splitResult.url==='<anonymous>')
continue;let url=parseOrScriptMatch(splitResult.url);if(!url&&Common.ParsedURL.isRelativeURL(splitResult.url))
url=parseOrScriptMatch(Common.ParsedURL.completeURL(baseURL,splitResult.url));if(!url)
return null;links.push({url:url,positionLeft:position+left,positionRight:position+right,lineNumber:splitResult.lineNumber,columnNumber:splitResult.columnNumber});}
if(!links.length)
return null;const formattedResult=createElement('span');let start=0;for(let i=0;i<links.length;++i){formattedResult.appendChild(this._linkifyStringAsFragment(string.substring(start,links[i].positionLeft)));const scriptLocationLink=this._linkifier.linkifyScriptLocation(debuggerModel.target(),null,links[i].url,links[i].lineNumber,links[i].columnNumber);scriptLocationLink.tabIndex=-1;this._selectableChildren.push({element:scriptLocationLink,forceSelect:()=>scriptLocationLink.focus()});formattedResult.appendChild(scriptLocationLink);start=links[i].positionRight;}
if(start!==string.length)
formattedResult.appendChild(this._linkifyStringAsFragment(string.substring(start)));return formattedResult;function parseOrScriptMatch(url){if(!url)
return null;const parsedURL=url.asParsedURL();if(parsedURL)
return parsedURL.url;if(debuggerModel.scriptsForSourceURL(url).length)
return url;return null;}}
_linkifyWithCustomLinkifier(string,linkifier){if(string.length>Console.ConsoleViewMessage._MaxTokenizableStringLength)
return UI.createExpandableText(string,Console.ConsoleViewMessage._LongStringVisibleLength);const container=createDocumentFragment();const tokens=Console.ConsoleViewMessage._tokenizeMessageText(string);for(const token of tokens){if(!token.text)
continue;switch(token.type){case'url':{const realURL=(token.text.startsWith('www.')?'http://'+token.text:token.text);const splitResult=Common.ParsedURL.splitLineAndColumn(realURL);let linkNode;if(splitResult)
linkNode=linkifier(token.text,splitResult.url,splitResult.lineNumber,splitResult.columnNumber);else
linkNode=linkifier(token.text,token.value);container.appendChild(linkNode);break;}
default:container.appendChild(createTextNode(token.text));break;}}
return container;}
_linkifyStringAsFragment(string){return this._linkifyWithCustomLinkifier(string,(text,url,lineNumber,columnNumber)=>{const linkElement=Components.Linkifier.linkifyURL(url,{text,lineNumber,columnNumber});linkElement.tabIndex=-1;this._selectableChildren.push({element:linkElement,forceSelect:()=>linkElement.focus()});return linkElement;});}
static _tokenizeMessageText(string){if(!Console.ConsoleViewMessage._tokenizerRegexes){const controlCodes='\\u0000-\\u0020\\u007f-\\u009f';const linkStringRegex=new RegExp('(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s'+controlCodes+'"]{2,}[^\\s'+controlCodes+'"\')}\\],:;.!?]','u');const pathLineRegex=/(?:\/[\w\.-]*)+\:[\d]+/;const timeRegex=/took [\d]+ms/;const eventRegex=/'\w+' event/;const milestoneRegex=/\sM[6-7]\d/;const autofillRegex=/\(suggested: \"[\w-]+\"\)/;const handlers=new Map();handlers.set(linkStringRegex,'url');handlers.set(pathLineRegex,'url');handlers.set(timeRegex,'time');handlers.set(eventRegex,'event');handlers.set(milestoneRegex,'milestone');handlers.set(autofillRegex,'autofill');Console.ConsoleViewMessage._tokenizerRegexes=Array.from(handlers.keys());Console.ConsoleViewMessage._tokenizerTypes=Array.from(handlers.values());}
if(string.length>Console.ConsoleViewMessage._MaxTokenizableStringLength)
return[{text:string,type:undefined}];const results=TextUtils.TextUtils.splitStringByRegexes(string,Console.ConsoleViewMessage._tokenizerRegexes);return results.map(result=>({text:result.value,type:Console.ConsoleViewMessage._tokenizerTypes[result.regexIndex]}));}
groupKey(){if(!this._groupKey)
this._groupKey=this._message.groupCategoryKey()+':'+this.groupTitle();return this._groupKey;}
groupTitle(){const tokens=Console.ConsoleViewMessage._tokenizeMessageText(this._message.messageText);const result=tokens.reduce((acc,token)=>{let text=token.text;if(token.type==='url')
text=Common.UIString('<URL>');else if(token.type==='time')
text=Common.UIString('took <N>ms');else if(token.type==='event')
text=Common.UIString('<some> event');else if(token.type==='milestone')
text=Common.UIString(' M<XX>');else if(token.type==='autofill')
text=Common.UIString('<attribute>');return acc+text;},'');return result.replace(/[%]o/g,'');}};Console.ConsoleGroupViewMessage=class extends Console.ConsoleViewMessage{constructor(consoleMessage,linkifier,badgePool,nestingLevel,onToggle,onResize){console.assert(consoleMessage.isGroupStartMessage());super(consoleMessage,linkifier,badgePool,nestingLevel,onResize);this._collapsed=consoleMessage.type===SDK.ConsoleMessage.MessageType.StartGroupCollapsed;this._expandGroupIcon=null;this._onToggle=onToggle;}
_setCollapsed(collapsed){this._collapsed=collapsed;if(this._expandGroupIcon)
this._expandGroupIcon.setIconType(this._collapsed?'smallicon-triangle-right':'smallicon-triangle-down');this._onToggle.call(null);}
collapsed(){return this._collapsed;}
maybeHandleOnKeyDown(event){const focusedChildIndex=this._focusedChildIndex();if(focusedChildIndex===-1){if((event.key==='ArrowLeft'&&!this._collapsed)||(event.key==='ArrowRight'&&this._collapsed)){this._setCollapsed(!this._collapsed);return true;}}
return super.maybeHandleOnKeyDown(event);}
toMessageElement(){if(!this._element){super.toMessageElement();const iconType=this._collapsed?'smallicon-triangle-right':'smallicon-triangle-down';this._expandGroupIcon=UI.Icon.create(iconType,'expand-group-icon');this._contentElement.tabIndex=-1;if(this._repeatCountElement)
this._repeatCountElement.insertBefore(this._expandGroupIcon,this._repeatCountElement.firstChild);else
this._element.insertBefore(this._expandGroupIcon,this._contentElement);this._element.addEventListener('click',()=>this._setCollapsed(!this._collapsed));}
return this._element;}
_showRepeatCountElement(){super._showRepeatCountElement();if(this._repeatCountElement&&this._expandGroupIcon)
this._repeatCountElement.insertBefore(this._expandGroupIcon,this._repeatCountElement.firstChild);}};Console.ConsoleViewMessage.MaxLengthForLinks=40;Console.ConsoleViewMessage._MaxTokenizableStringLength=10000;Console.ConsoleViewMessage._LongStringVisibleLength=5000;;Console.ConsolePrompt=class extends UI.Widget{constructor(){super();this.registerRequiredCSS('console/consolePrompt.css');this._addCompletionsFromHistory=true;this._history=new Console.ConsoleHistoryManager();this._initialText='';this._editor=null;this._eagerPreviewElement=createElementWithClass('div','console-eager-preview');this._textChangeThrottler=new Common.Throttler(150);this._formatter=new ObjectUI.RemoteObjectPreviewFormatter();this._requestPreviewBound=this._requestPreview.bind(this);this._innerPreviewElement=this._eagerPreviewElement.createChild('div','console-eager-inner-preview');this._eagerPreviewElement.appendChild(UI.Icon.create('smallicon-command-result','preview-result-icon'));const editorContainerElement=this.element.createChild('div','console-prompt-editor-container');this.element.appendChild(this._eagerPreviewElement);this._promptIcon=UI.Icon.create('smallicon-text-prompt','console-prompt-icon');this.element.appendChild(this._promptIcon);this._iconThrottler=new Common.Throttler(0);this._eagerEvalSetting=Common.settings.moduleSetting('consoleEagerEval');this._eagerEvalSetting.addChangeListener(this._eagerSettingChanged.bind(this));this._eagerPreviewElement.classList.toggle('hidden',!this._eagerEvalSetting.get());this.element.tabIndex=0;this._previewRequestForTest=null;this._defaultAutocompleteConfig=null;this._highlightingNode=false;self.runtime.extension(UI.TextEditorFactory).instance().then(gotFactory.bind(this));function gotFactory(factory){this._editor=factory.createEditor({devtoolsAccessibleName:ls`Console prompt`,lineNumbers:false,lineWrapping:true,mimeType:'javascript',autoHeight:true});this._defaultAutocompleteConfig=ObjectUI.JavaScriptAutocompleteConfig.createConfigForEditor(this._editor);this._editor.configureAutocomplete(Object.assign({},this._defaultAutocompleteConfig,{suggestionsCallback:this._wordsWithQuery.bind(this),anchorBehavior:UI.GlassPane.AnchorBehavior.PreferTop}));this._editor.widget().element.addEventListener('keydown',this._editorKeyDown.bind(this),true);this._editor.widget().show(editorContainerElement);this._editor.addEventListener(UI.TextEditor.Events.CursorChanged,this._updatePromptIcon,this);this._editor.addEventListener(UI.TextEditor.Events.TextChanged,this._onTextChanged,this);this._editor.addEventListener(UI.TextEditor.Events.SuggestionChanged,this._onTextChanged,this);this.setText(this._initialText);delete this._initialText;if(this.hasFocus())
this.focus();this.element.removeAttribute('tabindex');this._editor.widget().element.tabIndex=-1;this._editorSetForTest();Host.userMetrics.panelLoaded('console','DevTools.Launch.Console');}}
_eagerSettingChanged(){const enabled=this._eagerEvalSetting.get();this._eagerPreviewElement.classList.toggle('hidden',!enabled);if(enabled)
this._requestPreview();}
belowEditorElement(){return this._eagerPreviewElement;}
_onTextChanged(){if(this._eagerEvalSetting.get()){const asSoonAsPossible=!this._editor.textWithCurrentSuggestion();this._previewRequestForTest=this._textChangeThrottler.schedule(this._requestPreviewBound,asSoonAsPossible);}
this._updatePromptIcon();this.dispatchEventToListeners(Console.ConsolePrompt.Events.TextChanged);}
async _requestPreview(){const text=this._editor.textWithCurrentSuggestion().trim();const executionContext=UI.context.flavor(SDK.ExecutionContext);const{preview,result}=await ObjectUI.JavaScriptREPL.evaluateAndBuildPreview(text,true,500);this._innerPreviewElement.removeChildren();if(preview.deepTextContent()!==this._editor.textWithCurrentSuggestion().trim())
this._innerPreviewElement.appendChild(preview);if(result&&result.object&&result.object.subtype==='node'){this._highlightingNode=true;SDK.OverlayModel.highlightObjectAsDOMNode(result.object);}else if(this._highlightingNode){this._highlightingNode=false;SDK.OverlayModel.hideDOMNodeHighlight();}
if(result)
executionContext.runtimeModel.releaseEvaluationResult(result);}
willHide(){if(this._highlightingNode){this._highlightingNode=false;SDK.OverlayModel.hideDOMNodeHighlight();}}
history(){return this._history;}
clearAutocomplete(){if(this._editor)
this._editor.clearAutocomplete();}
_isCaretAtEndOfPrompt(){return!!this._editor&&this._editor.selection().collapseToEnd().equal(this._editor.fullRange().collapseToEnd());}
moveCaretToEndOfPrompt(){if(this._editor)
this._editor.setSelection(TextUtils.TextRange.createFromLocation(Infinity,Infinity));}
setText(text){if(this._editor)
this._editor.setText(text);else
this._initialText=text;this.dispatchEventToListeners(Console.ConsolePrompt.Events.TextChanged);}
text(){return this._editor?this._editor.text():this._initialText;}
setAddCompletionsFromHistory(value){this._addCompletionsFromHistory=value;}
_editorKeyDown(event){const keyboardEvent=(event);let newText;let isPrevious;const selection=this._editor.selection();const cursorY=this._editor.visualCoordinates(selection.endLine,selection.endColumn).y;switch(keyboardEvent.keyCode){case UI.KeyboardShortcut.Keys.Up.code:const startY=this._editor.visualCoordinates(0,0).y;if(keyboardEvent.shiftKey||!selection.isEmpty()||cursorY!==startY)
break;newText=this._history.previous(this.text());isPrevious=true;break;case UI.KeyboardShortcut.Keys.Down.code:const fullRange=this._editor.fullRange();const endY=this._editor.visualCoordinates(fullRange.endLine,fullRange.endColumn).y;if(keyboardEvent.shiftKey||!selection.isEmpty()||cursorY!==endY)
break;newText=this._history.next();break;case UI.KeyboardShortcut.Keys.P.code:if(Host.isMac()&&keyboardEvent.ctrlKey&&!keyboardEvent.metaKey&&!keyboardEvent.altKey&&!keyboardEvent.shiftKey){newText=this._history.previous(this.text());isPrevious=true;}
break;case UI.KeyboardShortcut.Keys.N.code:if(Host.isMac()&&keyboardEvent.ctrlKey&&!keyboardEvent.metaKey&&!keyboardEvent.altKey&&!keyboardEvent.shiftKey)
newText=this._history.next();break;case UI.KeyboardShortcut.Keys.Enter.code:this._enterKeyPressed(keyboardEvent);break;case UI.KeyboardShortcut.Keys.Tab.code:if(!this.text())
keyboardEvent.consume();break;}
if(newText===undefined)
return;keyboardEvent.consume(true);this.setText(newText);if(isPrevious)
this._editor.setSelection(TextUtils.TextRange.createFromLocation(0,Infinity));else
this.moveCaretToEndOfPrompt();}
async _enterWillEvaluate(){if(!this._isCaretAtEndOfPrompt())
return true;return await ObjectUI.JavaScriptAutocomplete.isExpressionComplete(this.text());}
_updatePromptIcon(){this._iconThrottler.schedule(async()=>{const canComplete=await this._enterWillEvaluate();this._promptIcon.classList.toggle('console-prompt-incomplete',!canComplete);});}
async _enterKeyPressed(event){if(event.altKey||event.ctrlKey||event.shiftKey)
return;event.consume(true);this.element.scrollIntoView();this.clearAutocomplete();const str=this.text();if(!str.length)
return;if(await this._enterWillEvaluate())
await this._appendCommand(str,true);else
this._editor.newlineAndIndent();this._enterProcessedForTest();}
async _appendCommand(text,useCommandLineAPI){this.setText('');const currentExecutionContext=UI.context.flavor(SDK.ExecutionContext);if(currentExecutionContext){const executionContext=currentExecutionContext;const message=SDK.consoleModel.addCommandMessage(executionContext,text);const wrappedResult=await ObjectUI.JavaScriptREPL.preprocessExpression(text);SDK.consoleModel.evaluateCommandInConsole(executionContext,message,wrappedResult.text,useCommandLineAPI,wrappedResult.preprocessed);if(Console.ConsolePanel.instance().isShowing())
Host.userMetrics.actionTaken(Host.UserMetrics.Action.CommandEvaluatedInConsolePanel);}}
_enterProcessedForTest(){}
_historyCompletions(prefix,force){const text=this.text();if(!this._addCompletionsFromHistory||!this._isCaretAtEndOfPrompt()||(!text&&!force))
return[];const result=[];const set=new Set();const data=this._history.historyData();for(let i=data.length-1;i>=0&&result.length<50;--i){const item=data[i];if(!item.startsWith(text))
continue;if(set.has(item))
continue;set.add(item);result.push({text:item.substring(text.length-prefix.length),iconType:'smallicon-text-prompt',isSecondary:true});}
return result;}
focus(){if(this._editor)
this._editor.widget().focus();else
this.element.focus();}
async _wordsWithQuery(queryRange,substituteRange,force){const query=this._editor.text(queryRange);const words=await this._defaultAutocompleteConfig.suggestionsCallback(queryRange,substituteRange,force);const historyWords=this._historyCompletions(query,force);return words.concat(historyWords);}
_editorSetForTest(){}};Console.ConsoleHistoryManager=class{constructor(){this._data=[];this._historyOffset=1;}
historyData(){return this._data;}
setHistoryData(data){this._data=data.slice();this._historyOffset=1;}
pushHistoryItem(text){if(this._uncommittedIsTop){this._data.pop();delete this._uncommittedIsTop;}
this._historyOffset=1;if(text===this._currentHistoryItem())
return;this._data.push(text);}
_pushCurrentText(currentText){if(this._uncommittedIsTop)
this._data.pop();this._uncommittedIsTop=true;this._data.push(currentText);}
previous(currentText){if(this._historyOffset>this._data.length)
return undefined;if(this._historyOffset===1)
this._pushCurrentText(currentText);++this._historyOffset;return this._currentHistoryItem();}
next(){if(this._historyOffset===1)
return undefined;--this._historyOffset;return this._currentHistoryItem();}
_currentHistoryItem(){return this._data[this._data.length-this._historyOffset];}};Console.ConsolePrompt.Events={TextChanged:Symbol('TextChanged')};;Console.ConsoleView=class extends UI.VBox{constructor(){super();this.setMinimumSize(0,35);this.registerRequiredCSS('console/consoleView.css');this.registerRequiredCSS('object_ui/objectValue.css');this._searchableView=new UI.SearchableView(this);this._searchableView.element.classList.add('console-searchable-view');this._searchableView.setPlaceholder(Common.UIString('Find string in logs'));this._searchableView.setMinimalSearchQuerySize(0);this._badgePool=new ProductRegistry.BadgePool();this._sidebar=new Console.ConsoleSidebar(this._badgePool);this._sidebar.addEventListener(Console.ConsoleSidebar.Events.FilterSelected,this._onFilterChanged.bind(this));this._isSidebarOpen=false;this._filter=new Console.ConsoleViewFilter(this._onFilterChanged.bind(this));const consoleToolbarContainer=this.element.createChild('div','console-toolbar-container');this._splitWidget=new UI.SplitWidget(true,false,'console.sidebar.width',100);this._splitWidget.setMainWidget(this._searchableView);this._splitWidget.setSidebarWidget(this._sidebar);this._splitWidget.show(this.element);this._splitWidget.hideSidebar();this._splitWidget.enableShowModeSaving();this._isSidebarOpen=this._splitWidget.showMode()===UI.SplitWidget.ShowMode.Both;if(this._isSidebarOpen)
this._filter._levelMenuButton.setEnabled(false);this._splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged,event=>{this._isSidebarOpen=event.data===UI.SplitWidget.ShowMode.Both;this._filter._levelMenuButton.setEnabled(!this._isSidebarOpen);this._onFilterChanged();});this._contentsElement=this._searchableView.element;this.element.classList.add('console-view');this._visibleViewMessages=[];this._hiddenByFilterCount=0;this._shouldBeHiddenCache=new Set();this._groupableMessages=new Map();this._groupableMessageTitle=new Map();this._regexMatchRanges=[];this._consoleContextSelector=new Console.ConsoleContextSelector();this._filterStatusText=new UI.ToolbarText();this._filterStatusText.element.classList.add('dimmed');this._showSettingsPaneSetting=Common.settings.createSetting('consoleShowSettingsToolbar',false);this._showSettingsPaneButton=new UI.ToolbarSettingToggle(this._showSettingsPaneSetting,'largeicon-settings-gear',Common.UIString('Console settings'));this._progressToolbarItem=new UI.ToolbarItem(createElement('div'));this._groupSimilarSetting=Common.settings.moduleSetting('consoleGroupSimilar');this._groupSimilarSetting.addChangeListener(()=>this._updateMessageList());const groupSimilarToggle=new UI.ToolbarSettingCheckbox(this._groupSimilarSetting,Common.UIString('Group similar'));const toolbar=new UI.Toolbar('console-main-toolbar',consoleToolbarContainer);const rightToolbar=new UI.Toolbar('',consoleToolbarContainer);toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton('console sidebar'));toolbar.appendToolbarItem(UI.Toolbar.createActionButton((UI.actionRegistry.action('console.clear'))));toolbar.appendSeparator();toolbar.appendToolbarItem(this._consoleContextSelector.toolbarItem());toolbar.appendSeparator();toolbar.appendToolbarItem(UI.Toolbar.createActionButton((UI.actionRegistry.action('console.create-pin'))));toolbar.appendSeparator();toolbar.appendToolbarItem(this._filter._textFilterUI);toolbar.appendToolbarItem(this._filter._levelMenuButton);toolbar.appendToolbarItem(this._progressToolbarItem);rightToolbar.appendSeparator();rightToolbar.appendToolbarItem(this._filterStatusText);rightToolbar.appendToolbarItem(this._showSettingsPaneButton);this._preserveLogCheckbox=new UI.ToolbarSettingCheckbox(Common.moduleSetting('preserveConsoleLog'),Common.UIString('Do not clear log on page reload / navigation'),Common.UIString('Preserve log'));this._hideNetworkMessagesCheckbox=new UI.ToolbarSettingCheckbox(this._filter._hideNetworkMessagesSetting,this._filter._hideNetworkMessagesSetting.title(),Common.UIString('Hide network'));const filterByExecutionContextCheckbox=new UI.ToolbarSettingCheckbox(this._filter._filterByExecutionContextSetting,Common.UIString('Only show messages from the current context (top, iframe, worker, extension)'),Common.UIString('Selected context only'));const monitoringXHREnabledSetting=Common.moduleSetting('monitoringXHREnabled');this._timestampsSetting=Common.moduleSetting('consoleTimestampsEnabled');this._consoleHistoryAutocompleteSetting=Common.moduleSetting('consoleHistoryAutocomplete');const settingsPane=new UI.HBox();settingsPane.show(this._contentsElement);settingsPane.element.classList.add('console-settings-pane');UI.ARIAUtils.setAccessibleName(settingsPane.element,ls`Console settings`);UI.ARIAUtils.markAsGroup(settingsPane.element);const settingsToolbarLeft=new UI.Toolbar('',settingsPane.element);settingsToolbarLeft.makeVertical();settingsToolbarLeft.appendToolbarItem(this._hideNetworkMessagesCheckbox);settingsToolbarLeft.appendToolbarItem(this._preserveLogCheckbox);settingsToolbarLeft.appendToolbarItem(filterByExecutionContextCheckbox);settingsToolbarLeft.appendToolbarItem(groupSimilarToggle);const settingsToolbarRight=new UI.Toolbar('',settingsPane.element);settingsToolbarRight.makeVertical();settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(monitoringXHREnabledSetting));const eagerEvalCheckbox=new UI.ToolbarSettingCheckbox(Common.settings.moduleSetting('consoleEagerEval'),ls`Eagerly evaluate text in the prompt`);settingsToolbarRight.appendToolbarItem(eagerEvalCheckbox);settingsToolbarRight.appendToolbarItem(new UI.ToolbarSettingCheckbox(this._consoleHistoryAutocompleteSetting));const userGestureCheckbox=new UI.ToolbarSettingCheckbox(Common.settings.moduleSetting('consoleUserActivationEval'));settingsToolbarRight.appendToolbarItem(userGestureCheckbox);if(!this._showSettingsPaneSetting.get())
settingsPane.element.classList.add('hidden');this._showSettingsPaneSetting.addChangeListener(()=>settingsPane.element.classList.toggle('hidden',!this._showSettingsPaneSetting.get()));this._pinPane=new Console.ConsolePinPane();this._pinPane.element.classList.add('console-view-pinpane');this._pinPane.show(this._contentsElement);this._pinPane.element.addEventListener('keydown',event=>{if((event.key==='Enter'&&UI.KeyboardShortcut.eventHasCtrlOrMeta((event)))||event.keyCode===UI.KeyboardShortcut.Keys.Esc.code){this._prompt.focus();event.consume();}});this._viewport=new Console.ConsoleViewport(this);this._viewport.setStickToBottom(true);this._viewport.contentElement().classList.add('console-group','console-group-messages');this._contentsElement.appendChild(this._viewport.element);this._messagesElement=this._viewport.element;this._messagesElement.id='console-messages';this._messagesElement.classList.add('monospace');this._messagesElement.addEventListener('click',this._messagesClicked.bind(this),false);this._messagesElement.addEventListener('paste',this._messagesPasted.bind(this),true);this._messagesElement.addEventListener('clipboard-paste',this._messagesPasted.bind(this),true);this._viewportThrottler=new Common.Throttler(50);this._pendingBatchResize=false;this._onMessageResizedBound=this._onMessageResized.bind(this);this._topGroup=Console.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._promptElement=this._messagesElement.createChild('div','source-code');this._promptElement.id='console-prompt';const selectAllFixer=this._messagesElement.createChild('div','console-view-fix-select-all');selectAllFixer.textContent='.';UI.ARIAUtils.markAsHidden(selectAllFixer);this._registerShortcuts();this._messagesElement.addEventListener('contextmenu',this._handleContextMenuEvent.bind(this),false);this._linkifier=new Components.Linkifier(Console.ConsoleViewMessage.MaxLengthForLinks);this._consoleMessages=[];this._viewMessageSymbol=Symbol('viewMessage');this._consoleHistorySetting=Common.settings.createLocalSetting('consoleHistory',[]);this._prompt=new Console.ConsolePrompt();this._prompt.show(this._promptElement);this._prompt.element.addEventListener('keydown',this._promptKeyDown.bind(this),true);this._prompt.addEventListener(Console.ConsolePrompt.Events.TextChanged,this._promptTextChanged,this);this._messagesElement.addEventListener('keydown',this._messagesKeyDown.bind(this),false);this._prompt.element.addEventListener('focusin',()=>{if(this._isScrolledToBottom())
this._viewport.setStickToBottom(true);});this._consoleHistoryAutocompleteSetting.addChangeListener(this._consoleHistoryAutocompleteChanged,this);const historyData=this._consoleHistorySetting.get();this._prompt.history().setHistoryData(historyData);this._consoleHistoryAutocompleteChanged();this._updateFilterStatus();this._timestampsSetting.addChangeListener(this._consoleTimestampsSettingChanged,this);this._registerWithMessageSink();UI.context.addFlavorChangeListener(SDK.ExecutionContext,this._executionContextChanged,this);this._messagesElement.addEventListener('mousedown',event=>this._updateStickToBottomOnPointerDown(event.button===2),false);this._messagesElement.addEventListener('mouseup',this._updateStickToBottomOnPointerUp.bind(this),false);this._messagesElement.addEventListener('mouseleave',this._updateStickToBottomOnPointerUp.bind(this),false);this._messagesElement.addEventListener('wheel',this._updateStickToBottomOnWheel.bind(this),false);this._messagesElement.addEventListener('touchstart',this._updateStickToBottomOnPointerDown.bind(this,false),false);this._messagesElement.addEventListener('touchend',this._updateStickToBottomOnPointerUp.bind(this),false);this._messagesElement.addEventListener('touchcancel',this._updateStickToBottomOnPointerUp.bind(this),false);SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.ConsoleCleared,this._consoleCleared,this);SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageAdded,this._onConsoleMessageAdded,this);SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.MessageUpdated,this._onConsoleMessageUpdated,this);SDK.consoleModel.addEventListener(SDK.ConsoleModel.Events.CommandEvaluated,this._commandEvaluated,this);SDK.consoleModel.messages().forEach(this._addConsoleMessage,this);}
static instance(){if(!Console.ConsoleView._instance)
Console.ConsoleView._instance=new Console.ConsoleView();return Console.ConsoleView._instance;}
static clearConsole(){SDK.consoleModel.requestClearMessages();}
_onFilterChanged(){this._filter._currentFilter.levelsMask=this._isSidebarOpen?Console.ConsoleFilter.allLevelsFilterValue():this._filter._messageLevelFiltersSetting.get();this._cancelBuildHiddenCache();if(this._immediatelyFilterMessagesForTest){for(const viewMessage of this._consoleMessages)
this._computeShouldMessageBeVisible(viewMessage);this._updateMessageList();return;}
this._buildHiddenCache(0,this._consoleMessages.slice());}
_setImmediatelyFilterMessagesForTest(){this._immediatelyFilterMessagesForTest=true;}
searchableView(){return this._searchableView;}
_clearHistory(){this._consoleHistorySetting.set([]);this._prompt.history().setHistoryData([]);}
_consoleHistoryAutocompleteChanged(){this._prompt.setAddCompletionsFromHistory(this._consoleHistoryAutocompleteSetting.get());}
itemCount(){return this._visibleViewMessages.length;}
itemElement(index){return this._visibleViewMessages[index];}
fastHeight(index){return this._visibleViewMessages[index].fastHeight();}
minimumRowHeight(){return 16;}
_registerWithMessageSink(){Common.console.messages().forEach(this._addSinkMessage,this);Common.console.addEventListener(Common.Console.Events.MessageAdded,messageAdded,this);function messageAdded(event){this._addSinkMessage((event.data));}}
_addSinkMessage(message){let level=SDK.ConsoleMessage.MessageLevel.Verbose;switch(message.level){case Common.Console.MessageLevel.Info:level=SDK.ConsoleMessage.MessageLevel.Info;break;case Common.Console.MessageLevel.Error:level=SDK.ConsoleMessage.MessageLevel.Error;break;case Common.Console.MessageLevel.Warning:level=SDK.ConsoleMessage.MessageLevel.Warning;break;}
const consoleMessage=new SDK.ConsoleMessage(null,SDK.ConsoleMessage.MessageSource.Other,level,message.text,SDK.ConsoleMessage.MessageType.System,undefined,undefined,undefined,undefined,undefined,message.timestamp);this._addConsoleMessage(consoleMessage);}
_consoleTimestampsSettingChanged(){this._updateMessageList();this._consoleMessages.forEach(viewMessage=>viewMessage.updateTimestamp());this._groupableMessageTitle.forEach(viewMessage=>viewMessage.updateTimestamp());}
_executionContextChanged(){this._prompt.clearAutocomplete();}
willHide(){this._hidePromptSuggestBox();}
wasShown(){this._viewport.refresh();}
focus(){if(this._viewport.hasVirtualSelection())
this._viewport.contentElement().focus();else
this._focusPrompt();}
_focusPrompt(){if(!this._prompt.hasFocus()){const oldStickToBottom=this._viewport.stickToBottom();const oldScrollTop=this._viewport.element.scrollTop;this._prompt.focus();this._viewport.setStickToBottom(oldStickToBottom);this._viewport.element.scrollTop=oldScrollTop;}}
restoreScrollPositions(){if(this._viewport.stickToBottom())
this._immediatelyScrollToBottom();else
super.restoreScrollPositions();}
onResize(){this._scheduleViewportRefresh();this._hidePromptSuggestBox();if(this._viewport.stickToBottom())
this._immediatelyScrollToBottom();for(let i=0;i<this._visibleViewMessages.length;++i)
this._visibleViewMessages[i].onResize();}
_hidePromptSuggestBox(){this._prompt.clearAutocomplete();}
_invalidateViewport(){if(this._muteViewportUpdates){this._maybeDirtyWhileMuted=true;return Promise.resolve();}
if(this._needsFullUpdate){this._updateMessageList();delete this._needsFullUpdate;}else{this._viewport.invalidate();}
return Promise.resolve();}
_scheduleViewportRefresh(){if(this._muteViewportUpdates){this._maybeDirtyWhileMuted=true;this._scheduleViewportRefreshForTest(true);return;}else{this._scheduleViewportRefreshForTest(false);}
this._scheduledRefreshPromiseForTest=this._viewportThrottler.schedule(this._invalidateViewport.bind(this));}
_scheduleViewportRefreshForTest(muted){}
_immediatelyScrollToBottom(){this._viewport.setStickToBottom(true);this._promptElement.scrollIntoView(true);}
_updateFilterStatus(){if(this._hiddenByFilterCount===this._lastShownHiddenByFilterCount)
return;this._filterStatusText.setText(ls`${this._hiddenByFilterCount} hidden`);this._filterStatusText.setVisible(!!this._hiddenByFilterCount);this._lastShownHiddenByFilterCount=this._hiddenByFilterCount;}
_onConsoleMessageAdded(event){const message=(event.data);this._addConsoleMessage(message);}
_addConsoleMessage(message){const viewMessage=this._createViewMessage(message);message[this._viewMessageSymbol]=viewMessage;if(message.type===SDK.ConsoleMessage.MessageType.Command||message.type===SDK.ConsoleMessage.MessageType.Result){const lastMessage=this._consoleMessages.peekLast();viewMessage[Console.ConsoleView._messageSortingTimeSymbol]=lastMessage?lastMessage[Console.ConsoleView._messageSortingTimeSymbol]:0;}else{viewMessage[Console.ConsoleView._messageSortingTimeSymbol]=viewMessage.consoleMessage().timestamp;}
let insertAt;if(!this._consoleMessages.length||timeComparator(viewMessage,this._consoleMessages[this._consoleMessages.length-1])>0)
insertAt=this._consoleMessages.length;else
insertAt=this._consoleMessages.upperBound(viewMessage,timeComparator);const insertedInMiddle=insertAt<this._consoleMessages.length;this._consoleMessages.splice(insertAt,0,viewMessage);this._filter.onMessageAdded(message);this._sidebar.onMessageAdded(viewMessage);let shouldGoIntoGroup=false;if(message.isGroupable()){const groupKey=viewMessage.groupKey();shouldGoIntoGroup=this._groupSimilarSetting.get()&&this._groupableMessages.has(groupKey);let list=this._groupableMessages.get(groupKey);if(!list){list=[];this._groupableMessages.set(groupKey,list);}
list.push(viewMessage);}
this._computeShouldMessageBeVisible(viewMessage);if(!shouldGoIntoGroup&&!insertedInMiddle){this._appendMessageToEnd(viewMessage);this._updateFilterStatus();this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);}else{this._needsFullUpdate=true;}
this._scheduleViewportRefresh();this._consoleMessageAddedForTest(viewMessage);function timeComparator(viewMessage1,viewMessage2){return viewMessage1[Console.ConsoleView._messageSortingTimeSymbol]-
viewMessage2[Console.ConsoleView._messageSortingTimeSymbol];}}
_onConsoleMessageUpdated(event){const message=(event.data);const viewMessage=message[this._viewMessageSymbol];if(viewMessage){viewMessage.updateMessageElement();this._computeShouldMessageBeVisible(viewMessage);this._updateMessageList();}}
_consoleMessageAddedForTest(viewMessage){}
_shouldMessageBeVisible(viewMessage){return!this._shouldBeHiddenCache.has(viewMessage);}
_computeShouldMessageBeVisible(viewMessage){if(this._filter.shouldBeVisible(viewMessage)&&(!this._isSidebarOpen||this._sidebar.shouldBeVisible(viewMessage)))
this._shouldBeHiddenCache.delete(viewMessage);else
this._shouldBeHiddenCache.add(viewMessage);}
_appendMessageToEnd(viewMessage,preventCollapse){if(!this._shouldMessageBeVisible(viewMessage)){this._hiddenByFilterCount++;return;}
if(!preventCollapse&&this._tryToCollapseMessages(viewMessage,this._visibleViewMessages.peekLast()))
return;const lastMessage=this._visibleViewMessages.peekLast();if(viewMessage.consoleMessage().type===SDK.ConsoleMessage.MessageType.EndGroup){if(lastMessage&&!this._currentGroup.messagesHidden())
lastMessage.incrementCloseGroupDecorationCount();this._currentGroup=this._currentGroup.parentGroup()||this._currentGroup;return;}
if(!this._currentGroup.messagesHidden()){const originatingMessage=viewMessage.consoleMessage().originatingMessage();if(lastMessage&&originatingMessage&&lastMessage.consoleMessage()===originatingMessage)
viewMessage.toMessageElement().classList.add('console-adjacent-user-command-result');this._visibleViewMessages.push(viewMessage);this._searchMessage(this._visibleViewMessages.length-1);}
if(viewMessage.consoleMessage().isGroupStartMessage())
this._currentGroup=new Console.ConsoleGroup(this._currentGroup,viewMessage);this._messageAppendedForTests();}
_messageAppendedForTests(){}
_createViewMessage(message){const nestingLevel=this._currentGroup.nestingLevel();switch(message.type){case SDK.ConsoleMessage.MessageType.Command:return new Console.ConsoleCommand(message,this._linkifier,this._badgePool,nestingLevel,this._onMessageResizedBound);case SDK.ConsoleMessage.MessageType.Result:return new Console.ConsoleCommandResult(message,this._linkifier,this._badgePool,nestingLevel,this._onMessageResizedBound);case SDK.ConsoleMessage.MessageType.StartGroupCollapsed:case SDK.ConsoleMessage.MessageType.StartGroup:return new Console.ConsoleGroupViewMessage(message,this._linkifier,this._badgePool,nestingLevel,this._updateMessageList.bind(this),this._onMessageResizedBound);default:return new Console.ConsoleViewMessage(message,this._linkifier,this._badgePool,nestingLevel,this._onMessageResizedBound);}}
async _onMessageResized(event){const treeElement=(event.data);if(this._pendingBatchResize||!treeElement.treeOutline)
return;this._pendingBatchResize=true;await Promise.resolve();const treeOutlineElement=treeElement.treeOutline.element;this._viewport.setStickToBottom(this._isScrolledToBottom());if(treeOutlineElement.offsetHeight<=this._messagesElement.offsetHeight)
treeOutlineElement.scrollIntoViewIfNeeded();this._pendingBatchResize=false;}
_consoleCleared(){const hadFocus=this._viewport.element.hasFocus();this._cancelBuildHiddenCache();this._currentMatchRangeIndex=-1;this._consoleMessages=[];this._groupableMessages.clear();this._groupableMessageTitle.clear();this._sidebar.clear();this._updateMessageList();this._hidePromptSuggestBox();this._viewport.setStickToBottom(true);this._linkifier.reset();this._badgePool.reset();this._filter.clear();if(hadFocus)
this._prompt.focus();}
_handleContextMenuEvent(event){const contextMenu=new UI.ContextMenu(event);if(event.target.isSelfOrDescendant(this._promptElement)){contextMenu.show();return;}
const sourceElement=event.target.enclosingNodeOrSelfWithClass('console-message-wrapper');const consoleMessage=sourceElement?sourceElement.message.consoleMessage():null;if(consoleMessage&&consoleMessage.url){const menuTitle=ls`Hide messages from ${new Common.ParsedURL(consoleMessage.url).displayName}`;contextMenu.headerSection().appendItem(menuTitle,this._filter.addMessageURLFilter.bind(this._filter,consoleMessage.url));}
contextMenu.defaultSection().appendAction('console.clear');contextMenu.defaultSection().appendAction('console.clear.history');contextMenu.saveSection().appendItem(Common.UIString('Save as...'),this._saveConsole.bind(this));if(this.element.hasSelection()){contextMenu.clipboardSection().appendItem(Common.UIString('Copy visible styled selection'),this._viewport.copyWithStyles.bind(this._viewport));}
if(consoleMessage){const request=SDK.NetworkLog.requestForConsoleMessage(consoleMessage);if(request&&SDK.NetworkManager.canReplayRequest(request))
contextMenu.debugSection().appendItem(ls`Replay XHR`,SDK.NetworkManager.replayRequest.bind(null,request));}
contextMenu.show();}
async _saveConsole(){const url=SDK.targetManager.mainTarget().inspectedURL();const parsedURL=url.asParsedURL();const filename=String.sprintf('%s-%d.log',parsedURL?parsedURL.host:'console',Date.now());const stream=new Bindings.FileOutputStream();const progressIndicator=new UI.ProgressIndicator();progressIndicator.setTitle(Common.UIString('Writing file…'));progressIndicator.setTotalWork(this.itemCount());const chunkSize=350;if(!await stream.open(filename))
return;this._progressToolbarItem.element.appendChild(progressIndicator.element);let messageIndex=0;while(messageIndex<this.itemCount()&&!progressIndicator.isCanceled()){const messageContents=[];let i;for(i=0;i<chunkSize&&i+messageIndex<this.itemCount();++i){const message=this.itemElement(messageIndex+i);messageContents.push(message.toExportString());}
messageIndex+=i;await stream.write(messageContents.join('\n')+'\n');progressIndicator.setWorked(messageIndex);}
stream.close();progressIndicator.done();}
_tryToCollapseMessages(viewMessage,lastMessage){const timestampsShown=this._timestampsSetting.get();if(!timestampsShown&&lastMessage&&!viewMessage.consoleMessage().isGroupMessage()&&viewMessage.consoleMessage().type!==SDK.ConsoleMessage.MessageType.Command&&viewMessage.consoleMessage().type!==SDK.ConsoleMessage.MessageType.Result&&viewMessage.consoleMessage().isEqual(lastMessage.consoleMessage())){lastMessage.incrementRepeatCount();if(viewMessage.isLastInSimilarGroup())
lastMessage.setInSimilarGroup(true,true);return true;}
return false;}
_buildHiddenCache(startIndex,viewMessages){const startTime=Date.now();let i;for(i=startIndex;i<viewMessages.length;++i){this._computeShouldMessageBeVisible(viewMessages[i]);if(i%10===0&&Date.now()-startTime>12)
break;}
if(i===viewMessages.length){this._updateMessageList();return;}
this._buildHiddenCacheTimeout=this.element.window().requestAnimationFrame(this._buildHiddenCache.bind(this,i,viewMessages));}
_cancelBuildHiddenCache(){this._shouldBeHiddenCache.clear();if(this._buildHiddenCacheTimeout){this.element.window().cancelAnimationFrame(this._buildHiddenCacheTimeout);delete this._buildHiddenCacheTimeout;}}
_updateMessageList(){this._topGroup=Console.ConsoleGroup.createTopGroup();this._currentGroup=this._topGroup;this._regexMatchRanges=[];this._hiddenByFilterCount=0;for(let i=0;i<this._visibleViewMessages.length;++i){this._visibleViewMessages[i].resetCloseGroupDecorationCount();this._visibleViewMessages[i].resetIncrementRepeatCount();}
this._visibleViewMessages=[];if(this._groupSimilarSetting.get()){this._addGroupableMessagesToEnd();}else{for(let i=0;i<this._consoleMessages.length;++i){this._consoleMessages[i].setInSimilarGroup(false);this._appendMessageToEnd(this._consoleMessages[i]);}}
this._updateFilterStatus();this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);this._viewport.invalidate();}
_addGroupableMessagesToEnd(){const alreadyAdded=new Set();const processedGroupKeys=new Set();for(let i=0;i<this._consoleMessages.length;++i){const viewMessage=this._consoleMessages[i];const message=viewMessage.consoleMessage();if(alreadyAdded.has(message))
continue;if(!message.isGroupable()){this._appendMessageToEnd(viewMessage);alreadyAdded.add(message);continue;}
const key=viewMessage.groupKey();const viewMessagesInGroup=this._groupableMessages.get(key);if(!viewMessagesInGroup||viewMessagesInGroup.length<5){viewMessage.setInSimilarGroup(false);this._appendMessageToEnd(viewMessage);alreadyAdded.add(message);continue;}
if(processedGroupKeys.has(key))
continue;if(!viewMessagesInGroup.find(x=>this._shouldMessageBeVisible(x))){alreadyAdded.addAll(viewMessagesInGroup);processedGroupKeys.add(key);continue;}
let startGroupViewMessage=this._groupableMessageTitle.get(key);if(!startGroupViewMessage){const startGroupMessage=new SDK.ConsoleMessage(null,message.source,message.level,viewMessage.groupTitle(),SDK.ConsoleMessage.MessageType.StartGroupCollapsed);startGroupViewMessage=this._createViewMessage(startGroupMessage);this._groupableMessageTitle.set(key,startGroupViewMessage);}
startGroupViewMessage.setRepeatCount(viewMessagesInGroup.length);this._appendMessageToEnd(startGroupViewMessage);for(const viewMessageInGroup of viewMessagesInGroup){viewMessageInGroup.setInSimilarGroup(true,viewMessagesInGroup.peekLast()===viewMessageInGroup);this._appendMessageToEnd(viewMessageInGroup,true);alreadyAdded.add(viewMessageInGroup.consoleMessage());}
const endGroupMessage=new SDK.ConsoleMessage(null,message.source,message.level,message.messageText,SDK.ConsoleMessage.MessageType.EndGroup);this._appendMessageToEnd(this._createViewMessage(endGroupMessage));}}
_messagesClicked(event){const target=(event.target);if(!this._messagesElement.hasSelection()){const clickedOutsideMessageList=target===this._messagesElement||this._prompt.belowEditorElement().isSelfOrAncestor(target);if(clickedOutsideMessageList){this._prompt.moveCaretToEndOfPrompt();this._focusPrompt();}}}
_messagesKeyDown(event){const hasActionModifier=event.ctrlKey||event.altKey||event.metaKey;if(hasActionModifier||event.key.length!==1||UI.isEditing()||this._messagesElement.hasSelection())
return;this._prompt.moveCaretToEndOfPrompt();this._focusPrompt();}
_messagesPasted(event){if(UI.isEditing())
return;this._prompt.focus();}
_registerShortcuts(){this._shortcuts={};this._shortcuts[UI.KeyboardShortcut.makeKey('u',UI.KeyboardShortcut.Modifiers.Ctrl)]=this._clearPromptBackwards.bind(this);}
_clearPromptBackwards(){this._prompt.setText('');}
_promptKeyDown(event){const keyboardEvent=(event);if(keyboardEvent.key==='PageUp'){this._updateStickToBottomOnWheel();return;}
const shortcut=UI.KeyboardShortcut.makeKeyFromEvent(keyboardEvent);const handler=this._shortcuts[shortcut];if(handler){handler();keyboardEvent.preventDefault();}}
_printResult(result,originatingConsoleMessage,exceptionDetails){if(!result)
return;const level=!!exceptionDetails?SDK.ConsoleMessage.MessageLevel.Error:SDK.ConsoleMessage.MessageLevel.Info;let message;if(!exceptionDetails){message=new SDK.ConsoleMessage(result.runtimeModel(),SDK.ConsoleMessage.MessageSource.JS,level,'',SDK.ConsoleMessage.MessageType.Result,undefined,undefined,undefined,[result]);}else{message=SDK.ConsoleMessage.fromException(result.runtimeModel(),exceptionDetails,SDK.ConsoleMessage.MessageType.Result,undefined,undefined);}
message.setOriginatingMessage(originatingConsoleMessage);SDK.consoleModel.addMessage(message);}
_commandEvaluated(event){const data=(event.data);this._prompt.history().pushHistoryItem(data.commandMessage.messageText);this._consoleHistorySetting.set(this._prompt.history().historyData().slice(-Console.ConsoleView.persistedHistorySize));this._printResult(data.result,data.commandMessage,data.exceptionDetails);}
elementsToRestoreScrollPositionsFor(){return[this._messagesElement];}
searchCanceled(){this._cleanupAfterSearch();for(let i=0;i<this._visibleViewMessages.length;++i){const message=this._visibleViewMessages[i];message.setSearchRegex(null);}
this._currentMatchRangeIndex=-1;this._regexMatchRanges=[];delete this._searchRegex;this._viewport.refresh();}
performSearch(searchConfig,shouldJump,jumpBackwards){this.searchCanceled();this._searchableView.updateSearchMatchesCount(0);this._searchRegex=searchConfig.toSearchRegex(true);this._regexMatchRanges=[];this._currentMatchRangeIndex=-1;if(shouldJump)
this._searchShouldJumpBackwards=!!jumpBackwards;this._searchProgressIndicator=new UI.ProgressIndicator();this._searchProgressIndicator.setTitle(Common.UIString('Searching…'));this._searchProgressIndicator.setTotalWork(this._visibleViewMessages.length);this._progressToolbarItem.element.appendChild(this._searchProgressIndicator.element);this._innerSearch(0);}
_cleanupAfterSearch(){delete this._searchShouldJumpBackwards;if(this._innerSearchTimeoutId){clearTimeout(this._innerSearchTimeoutId);delete this._innerSearchTimeoutId;}
if(this._searchProgressIndicator){this._searchProgressIndicator.done();delete this._searchProgressIndicator;}}
_searchFinishedForTests(){}
_innerSearch(index){delete this._innerSearchTimeoutId;if(this._searchProgressIndicator.isCanceled()){this._cleanupAfterSearch();return;}
const startTime=Date.now();for(;index<this._visibleViewMessages.length&&Date.now()-startTime<100;++index)
this._searchMessage(index);this._searchableView.updateSearchMatchesCount(this._regexMatchRanges.length);if(typeof this._searchShouldJumpBackwards!=='undefined'&&this._regexMatchRanges.length){this._jumpToMatch(this._searchShouldJumpBackwards?-1:0);delete this._searchShouldJumpBackwards;}
if(index===this._visibleViewMessages.length){this._cleanupAfterSearch();setTimeout(this._searchFinishedForTests.bind(this),0);return;}
this._innerSearchTimeoutId=setTimeout(this._innerSearch.bind(this,index),100);this._searchProgressIndicator.setWorked(index);}
_searchMessage(index){const message=this._visibleViewMessages[index];message.setSearchRegex(this._searchRegex);for(let i=0;i<message.searchCount();++i)
this._regexMatchRanges.push({messageIndex:index,matchIndex:i});}
jumpToNextSearchResult(){this._jumpToMatch(this._currentMatchRangeIndex+1);}
jumpToPreviousSearchResult(){this._jumpToMatch(this._currentMatchRangeIndex-1);}
supportsCaseSensitiveSearch(){return true;}
supportsRegexSearch(){return true;}
_jumpToMatch(index){if(!this._regexMatchRanges.length)
return;let matchRange;if(this._currentMatchRangeIndex>=0){matchRange=this._regexMatchRanges[this._currentMatchRangeIndex];const message=this._visibleViewMessages[matchRange.messageIndex];message.searchHighlightNode(matchRange.matchIndex).classList.remove(UI.highlightedCurrentSearchResultClassName);}
index=mod(index,this._regexMatchRanges.length);this._currentMatchRangeIndex=index;this._searchableView.updateCurrentMatchIndex(index);matchRange=this._regexMatchRanges[index];const message=this._visibleViewMessages[matchRange.messageIndex];const highlightNode=message.searchHighlightNode(matchRange.matchIndex);highlightNode.classList.add(UI.highlightedCurrentSearchResultClassName);this._viewport.scrollItemIntoView(matchRange.messageIndex);highlightNode.scrollIntoViewIfNeeded();}
_updateStickToBottomOnPointerDown(isRightClick){this._muteViewportUpdates=!isRightClick;this._viewport.setStickToBottom(false);if(this._waitForScrollTimeout){clearTimeout(this._waitForScrollTimeout);delete this._waitForScrollTimeout;}}
_updateStickToBottomOnPointerUp(){if(!this._muteViewportUpdates)
return;this._waitForScrollTimeout=setTimeout(updateViewportState.bind(this),200);function updateViewportState(){this._muteViewportUpdates=false;if(this.isShowing())
this._viewport.setStickToBottom(this._isScrolledToBottom());if(this._maybeDirtyWhileMuted){this._scheduleViewportRefresh();delete this._maybeDirtyWhileMuted;}
delete this._waitForScrollTimeout;this._updateViewportStickinessForTest();}}
_updateViewportStickinessForTest(){}
_updateStickToBottomOnWheel(){this._updateStickToBottomOnPointerDown();this._updateStickToBottomOnPointerUp();}
_promptTextChanged(){const oldStickToBottom=this._viewport.stickToBottom();const willStickToBottom=this._isScrolledToBottom();this._viewport.setStickToBottom(willStickToBottom);if(willStickToBottom&&!oldStickToBottom)
this._scheduleViewportRefresh();this._promptTextChangedForTest();}
_promptTextChangedForTest(){}
_isScrolledToBottom(){const distanceToPromptEditorBottom=this._messagesElement.scrollHeight-this._messagesElement.scrollTop-
this._messagesElement.clientHeight-this._prompt.belowEditorElement().offsetHeight;return distanceToPromptEditorBottom<=2;}};Console.ConsoleView.persistedHistorySize=300;Console.ConsoleViewFilter=class{constructor(filterChangedCallback){this._filterChanged=filterChangedCallback;this._messageLevelFiltersSetting=Console.ConsoleViewFilter.levelFilterSetting();this._hideNetworkMessagesSetting=Common.moduleSetting('hideNetworkMessages');this._filterByExecutionContextSetting=Common.moduleSetting('selectedContextFilterEnabled');this._messageLevelFiltersSetting.addChangeListener(this._onFilterChanged.bind(this));this._hideNetworkMessagesSetting.addChangeListener(this._onFilterChanged.bind(this));this._filterByExecutionContextSetting.addChangeListener(this._onFilterChanged.bind(this));UI.context.addFlavorChangeListener(SDK.ExecutionContext,this._onFilterChanged,this);const filterKeys=Object.values(Console.ConsoleFilter.FilterType);this._suggestionBuilder=new UI.FilterSuggestionBuilder(filterKeys);this._textFilterUI=new UI.ToolbarInput(Common.UIString('Filter'),0.2,1,Common.UIString('e.g. /event\\d/ -cdn url:a.com'),this._suggestionBuilder.completions.bind(this._suggestionBuilder));this._textFilterSetting=Common.settings.createSetting('console.textFilter','');if(this._textFilterSetting.get())
this._textFilterUI.setValue(this._textFilterSetting.get());this._textFilterUI.addEventListener(UI.ToolbarInput.Event.TextChanged,()=>{this._textFilterSetting.set(this._textFilterUI.value());this._onFilterChanged();});this._filterParser=new TextUtils.FilterParser(filterKeys);this._currentFilter=new Console.ConsoleFilter('',[],null,this._messageLevelFiltersSetting.get());this._updateCurrentFilter();this._levelLabels={};this._levelLabels[SDK.ConsoleMessage.MessageLevel.Verbose]=Common.UIString('Verbose');this._levelLabels[SDK.ConsoleMessage.MessageLevel.Info]=Common.UIString('Info');this._levelLabels[SDK.ConsoleMessage.MessageLevel.Warning]=Common.UIString('Warnings');this._levelLabels[SDK.ConsoleMessage.MessageLevel.Error]=Common.UIString('Errors');this._levelMenuButton=new UI.ToolbarButton(ls`Log levels`);this._levelMenuButton.turnIntoSelect();this._levelMenuButton.addEventListener(UI.ToolbarButton.Events.Click,this._showLevelContextMenu.bind(this));this._updateLevelMenuButtonText();this._messageLevelFiltersSetting.addChangeListener(this._updateLevelMenuButtonText.bind(this));}
onMessageAdded(message){if(message.type===SDK.ConsoleMessage.MessageType.Command||message.type===SDK.ConsoleMessage.MessageType.Result||message.isGroupMessage())
return;if(message.context)
this._suggestionBuilder.addItem(Console.ConsoleFilter.FilterType.Context,message.context);if(message.source)
this._suggestionBuilder.addItem(Console.ConsoleFilter.FilterType.Source,message.source);if(message.url)
this._suggestionBuilder.addItem(Console.ConsoleFilter.FilterType.Url,message.url);}
static levelFilterSetting(){return Common.settings.createSetting('messageLevelFilters',Console.ConsoleFilter.defaultLevelsFilterValue());}
_updateCurrentFilter(){const parsedFilters=this._filterParser.parse(this._textFilterUI.value());if(this._hideNetworkMessagesSetting.get()){parsedFilters.push({key:Console.ConsoleFilter.FilterType.Source,text:SDK.ConsoleMessage.MessageSource.Network,negative:true});}
this._currentFilter.executionContext=this._filterByExecutionContextSetting.get()?UI.context.flavor(SDK.ExecutionContext):null;this._currentFilter.parsedFilters=parsedFilters;this._currentFilter.levelsMask=this._messageLevelFiltersSetting.get();}
_onFilterChanged(){this._updateCurrentFilter();this._filterChanged();}
_updateLevelMenuButtonText(){let isAll=true;let isDefault=true;const allValue=Console.ConsoleFilter.allLevelsFilterValue();const defaultValue=Console.ConsoleFilter.defaultLevelsFilterValue();let text=null;const levels=this._messageLevelFiltersSetting.get();for(const name of Object.values(SDK.ConsoleMessage.MessageLevel)){isAll=isAll&&levels[name]===allValue[name];isDefault=isDefault&&levels[name]===defaultValue[name];if(levels[name])
text=text?Common.UIString('Custom levels'):Common.UIString('%s only',this._levelLabels[name]);}
if(isAll)
text=Common.UIString('All levels');else if(isDefault)
text=Common.UIString('Default levels');else
text=text||Common.UIString('Hide all');this._levelMenuButton.element.classList.toggle('warning',!isAll&&!isDefault);this._levelMenuButton.setText(text);this._levelMenuButton.setTitle(ls`Log level: ${text}`);}
_showLevelContextMenu(event){const mouseEvent=(event.data);const setting=this._messageLevelFiltersSetting;const levels=setting.get();const contextMenu=new UI.ContextMenu(mouseEvent,true,this._levelMenuButton.element.totalOffsetLeft(),this._levelMenuButton.element.totalOffsetTop()+this._levelMenuButton.element.offsetHeight);contextMenu.headerSection().appendItem(Common.UIString('Default'),()=>setting.set(Console.ConsoleFilter.defaultLevelsFilterValue()));for(const level in this._levelLabels){contextMenu.defaultSection().appendCheckboxItem(this._levelLabels[level],toggleShowLevel.bind(null,level),levels[level]);}
contextMenu.show();function toggleShowLevel(level){levels[level]=!levels[level];setting.set(levels);}}
addMessageURLFilter(url){if(!url)
return;const suffix=this._textFilterUI.value()?` ${this._textFilterUI.value()}`:'';this._textFilterUI.setValue(`-url:${url}${suffix}`);this._textFilterSetting.set(this._textFilterUI.value());this._onFilterChanged();}
shouldBeVisible(viewMessage){return this._currentFilter.shouldBeVisible(viewMessage);}
clear(){this._suggestionBuilder.clear();}
reset(){this._messageLevelFiltersSetting.set(Console.ConsoleFilter.defaultLevelsFilterValue());this._filterByExecutionContextSetting.set(false);this._hideNetworkMessagesSetting.set(false);this._textFilterUI.setValue('');this._onFilterChanged();}};Console.ConsoleCommand=class extends Console.ConsoleViewMessage{contentElement(){if(!this._contentElement){this._contentElement=createElementWithClass('div','console-user-command');const icon=UI.Icon.create('smallicon-user-command','command-result-icon');this._contentElement.appendChild(icon);this._contentElement.message=this;this._formattedCommand=createElementWithClass('span','source-code');this._formattedCommand.textContent=this.text.replaceControlCharacters();this._contentElement.appendChild(this._formattedCommand);if(this._formattedCommand.textContent.length<Console.ConsoleCommand.MaxLengthToIgnoreHighlighter){const javascriptSyntaxHighlighter=new UI.SyntaxHighlighter('text/javascript',true);javascriptSyntaxHighlighter.syntaxHighlightNode(this._formattedCommand).then(this._updateSearch.bind(this));}else{this._updateSearch();}
this.updateTimestamp();}
return this._contentElement;}
_updateSearch(){this.setSearchRegex(this.searchRegex());}};Console.ConsoleCommand.MaxLengthToIgnoreHighlighter=10000;Console.ConsoleCommandResult=class extends Console.ConsoleViewMessage{contentElement(){const element=super.contentElement();if(!element.classList.contains('console-user-command-result')){element.classList.add('console-user-command-result');if(this.consoleMessage().level===SDK.ConsoleMessage.MessageLevel.Info){const icon=UI.Icon.create('smallicon-command-result','command-result-icon');element.insertBefore(icon,element.firstChild);}}
return element;}};Console.ConsoleGroup=class{constructor(parentGroup,groupMessage){this._parentGroup=parentGroup;this._nestingLevel=parentGroup?parentGroup.nestingLevel()+1:0;this._messagesHidden=groupMessage&&groupMessage.collapsed()||this._parentGroup&&this._parentGroup.messagesHidden();}
static createTopGroup(){return new Console.ConsoleGroup(null,null);}
messagesHidden(){return this._messagesHidden;}
nestingLevel(){return this._nestingLevel;}
parentGroup(){return this._parentGroup;}};Console.ConsoleView.ActionDelegate=class{handleAction(context,actionId){switch(actionId){case'console.show':InspectorFrontendHost.bringToFront();Common.console.show();Console.ConsoleView.instance()._focusPrompt();return true;case'console.clear':Console.ConsoleView.clearConsole();return true;case'console.clear.history':Console.ConsoleView.instance()._clearHistory();return true;case'console.create-pin':Console.ConsoleView.instance()._pinPane.addPin('',true);return true;}
return false;}};Console.ConsoleView.RegexMatchRange;Console.ConsoleView._messageSortingTimeSymbol=Symbol('messageSortingTime');;Console.ConsolePanel=class extends UI.Panel{constructor(){super('console');this._view=Console.ConsoleView.instance();}
static instance(){return(self.runtime.sharedInstance(Console.ConsolePanel));}
static _updateContextFlavor(){const consoleView=Console.ConsolePanel.instance()._view;UI.context.setFlavor(Console.ConsoleView,consoleView.isShowing()?consoleView:null);}
wasShown(){super.wasShown();const wrapper=Console.ConsolePanel.WrapperView._instance;if(wrapper&&wrapper.isShowing())
UI.inspectorView.setDrawerMinimized(true);this._view.show(this.element);Console.ConsolePanel._updateContextFlavor();}
willHide(){super.willHide();UI.inspectorView.setDrawerMinimized(false);if(Console.ConsolePanel.WrapperView._instance)
Console.ConsolePanel.WrapperView._instance._showViewInWrapper();Console.ConsolePanel._updateContextFlavor();}
searchableView(){return Console.ConsoleView.instance().searchableView();}};Console.ConsolePanel.WrapperView=class extends UI.VBox{constructor(){super();this.element.classList.add('console-view-wrapper');Console.ConsolePanel.WrapperView._instance=this;this._view=Console.ConsoleView.instance();}
wasShown(){if(!Console.ConsolePanel.instance().isShowing())
this._showViewInWrapper();else
UI.inspectorView.setDrawerMinimized(true);Console.ConsolePanel._updateContextFlavor();}
willHide(){UI.inspectorView.setDrawerMinimized(false);Console.ConsolePanel._updateContextFlavor();}
_showViewInWrapper(){this._view.show(this.element);}};Console.ConsolePanel.ConsoleRevealer=class{reveal(object){const consoleView=Console.ConsoleView.instance();if(consoleView.isShowing()){consoleView.focus();return Promise.resolve();}
UI.viewManager.showView('console-view');return Promise.resolve();}};;Runtime.cachedResources["console/consoleContextSelector.css"]="/*\n * Copyright 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    padding: 2px 1px 2px 2px;\n    white-space: nowrap;\n    display: flex;\n    flex-direction: column;\n    height: 36px;\n    justify-content: center;\n}\n\n.title {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    flex-grow: 0;\n}\n\n.badge {\n    pointer-events: none;\n    margin-right: 4px;\n    display: inline-block;\n    height: 15px;\n}\n\n.subtitle {\n    color: #999;\n    margin-right: 3px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    flex-grow: 0;\n}\n\n:host(.highlighted) .subtitle {\n    color: inherit;\n}\n\n/*# sourceURL=console/consoleContextSelector.css */";Runtime.cachedResources["console/consolePinPane.css"]="/*\n * Copyright 2018 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n.console-pins {\n  overflow-y: auto;\n  background: var(--toolbar-bg-color);\n  --error-background-color: hsl(0, 100%, 97%);\n  --error-border-color: hsl(0, 100%, 92%);\n  --error-text-color: red;\n}\n\n:host-context(.-theme-with-dark-background) .console-pins {\n  --error-background-color: hsl(0, 100%, 8%);\n  --error-border-color: rgb(92, 0, 0);\n  --error-text-color: hsl(0, 100%, 75%);\n}\n\n.console-pins:not(:empty) {\n  border-bottom: 1px solid var(--divider-color);\n}\n\n.console-pin {\n  position: relative;\n  user-select: text;\n  flex: none;\n  padding: 2px 0 6px 24px;\n}\n\n.console-pin:not(:last-child) {\n  border-bottom: 1px solid #e4e4e4;\n}\n\n.console-pin:not(:last-child).error-level:not(:focus-within) {\n  border-top: 1px solid var(--error-border-color);\n  border-bottom: 1px solid var(--error-border-color);\n  margin-top: -1px;\n}\n\n.console-pin.error-level:not(:focus-within) {\n  background-color: var(--error-background-color);\n  color: var(--error-text-color);\n}\n\n.console-pin-name {\n  margin-left: -4px;\n  margin-bottom: 1px;\n  height: auto;\n}\n\n.console-pin-name,\n.console-pin-preview {\n  width: 100%;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  min-height: 13px;\n}\n\n:host-context(.-theme-with-dark-background) .console-delete-pin {\n  filter: brightness(2);\n}\n\n.console-delete-pin {\n  position: absolute;\n  top: 8px;\n  left: 8px;\n  opacity: 0.7;\n  cursor: pointer;\n}\n\n.console-delete-pin:hover,\n.console-delete-pin[data-keyboard-focus=\"true\"]:focus {\n  opacity: 1;\n}\n\n.console-pin-name:focus-within {\n  background: #fff;\n  box-shadow: var(--focus-ring-active-shadow) inset;\n}\n\n.console-pin:focus-within .console-pin-preview,\n.console-pin-name:not(:focus-within):not(:hover) {\n  opacity: 0.6;\n}\n\n/*# sourceURL=console/consolePinPane.css */";Runtime.cachedResources["console/consolePrompt.css"]="/*\n * Copyright 2018 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n#console-prompt .CodeMirror {\n  padding: 3px 0 1px 0;\n}\n\n#console-prompt .CodeMirror-line {\n  padding-top: 0;\n}\n\n#console-prompt .CodeMirror-lines {\n  padding-top: 0;\n}\n\n#console-prompt .console-prompt-icon {\n  position: absolute;\n  left: -13px;\n  top: 5px;\n  -webkit-user-select: none;\n}\n\n.console-eager-preview {\n  padding-bottom: 2px;\n  opacity: 0.6;\n  position: relative;\n  height: 15px;\n}\n\n.console-eager-inner-preview {\n  text-overflow: ellipsis;\n  overflow: hidden;\n  margin-left: 4px;\n  height: 100%;\n}\n\n.console-eager-inner-preview {\n  white-space: nowrap;\n}\n\n.console-eager-inner-preview:empty,\n.console-eager-inner-preview:empty + .preview-result-icon {\n  opacity: 0;\n}\n\n.preview-result-icon {\n  position: absolute;\n  left: -13px;\n  top: 1px;\n}\n\n.console-prompt-icon.console-prompt-incomplete {\n  opacity: 0.65;\n}\n\n/*# sourceURL=console/consolePrompt.css */";Runtime.cachedResources["console/consoleSidebar.css"]="/*\n * Copyright (c) 2017 The Chromium Authors. All rights reserved.\n * Use of this source code is governed by a BSD-style license that can be\n * found in the LICENSE file.\n */\n\n:host {\n    overflow: auto;\n    background-color: var(--toolbar-bg-color);\n}\n\n.tree-outline-disclosure {\n    max-width: 100%;\n    padding-left: 6px;\n}\n\n.count {\n    flex: none;\n    margin: 0 8px;\n}\n\n[is=ui-icon] {\n    margin: 0 5px;\n}\n\n[is=ui-icon].icon-mask {\n    background-color: #555;\n}\n\nli {\n    height: 24px;\n}\n\nli .largeicon-navigator-file {\n    background: linear-gradient(45deg, hsl(48, 70%, 50%), hsl(48, 70%, 70%));\n    margin: 0;\n}\n\nli .largeicon-navigator-folder {\n    background: linear-gradient(45deg, hsl(210, 82%, 65%), hsl(210, 82%, 80%));\n    margin: -3px -3px 0 -5px;\n}\n\n.tree-element-title {\n    flex-shrink: 100;\n    flex-grow: 1;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n\n.tree-outline li:hover:not(.selected) .selection {\n    display: block;\n    background-color: rgba(56, 121, 217, 0.1);\n}\n\n/*# sourceURL=console/consoleSidebar.css */";Runtime.cachedResources["console/consoleView.css"]="/*\n * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.\n * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>\n *\n * Redistribution and use in source and binary forms, with or without\n * modification, are permitted provided that the following conditions\n * are met:\n *\n * 1.  Redistributions of source code must retain the above copyright\n *     notice, this list of conditions and the following disclaimer.\n * 2.  Redistributions in binary form must reproduce the above copyright\n *     notice, this list of conditions and the following disclaimer in the\n *     documentation and/or other materials provided with the distribution.\n * 3.  Neither the name of Apple Computer, Inc. (\"Apple\") nor the names of\n *     its contributors may be used to endorse or promote products derived\n *     from this software without specific prior written permission.\n *\n * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS \"AS IS\" AND ANY\n * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY\n * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\n * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n */\n\n.console-view {\n    background-color: white;\n    overflow: hidden;\n    --message-border-color: rgb(240, 240, 240);\n    --warning-border-color: hsl(50, 100%, 88%);\n    --error-border-color: hsl(0, 100%, 92%);\n    --error-text-color: red;\n}\n\n.-theme-with-dark-background .console-view {\n    --message-border-color: rgb(58, 58, 58);\n    --warning-border-color: rgb(102, 85, 0);\n    --error-border-color: rgb(92, 0, 0);\n    --error-text-color: hsl(0, 100%, 75%);\n}\n\n.console-toolbar-container {\n    display: flex;\n    flex: none;\n}\n\n.console-main-toolbar {\n    flex: 1 1 auto;\n}\n\n.console-toolbar-container > .toolbar {\n    background-color: var(--toolbar-bg-color);\n    border-bottom: var(--divider-border);\n}\n\n.console-view-wrapper {\n    background-color: #eee;\n}\n\n.console-view-fix-select-all {\n    height: 0;\n    overflow: hidden;\n}\n\n.console-settings-pane {\n    flex: none;\n    background-color: var(--toolbar-bg-color);\n    border-bottom: var(--divider-border);\n}\n\n.console-settings-pane .toolbar {\n    flex: 1 1;\n}\n\n#console-messages {\n    flex: 1 1;\n    overflow-y: auto;\n    word-wrap: break-word;\n    -webkit-user-select: text;\n    transform: translateZ(0);\n    overflow-anchor: none;  /* Chrome-specific scroll-anchoring opt-out */\n}\n\n#console-prompt {\n    clear: right;\n    position: relative;\n    margin: 0 22px 0 20px;\n}\n\n.console-prompt-editor-container {\n    min-height: 21px;\n}\n\n.console-message,\n.console-user-command {\n    clear: right;\n    position: relative;\n    padding: 3px 22px 1px 0;\n    margin-left: 24px;\n    min-height: 17px;  /* Sync with ConsoleViewMessage.js */\n    flex: auto;\n    display: flex;\n}\n\n.console-message > * {\n    flex: auto;\n}\n\n.console-timestamp {\n    color: gray;\n    -webkit-user-select: none;\n    flex: none;\n    margin-right: 5px;\n}\n\n.message-level-icon, .command-result-icon {\n    position: absolute;\n    left: -17px;\n    top: 4px;\n    -webkit-user-select: none;\n}\n\n.console-message-repeat-count {\n    margin: 2px 0 0 10px;\n    flex: none;\n}\n\n.repeated-message {\n    margin-left: 4px;\n}\n\n.repeated-message .message-level-icon {\n    display: none;\n}\n\n.repeated-message .console-message-stack-trace-toggle,\n.repeated-message > .console-message-text {\n    flex: 1;\n}\n\n.console-error-level .repeated-message,\n.console-warning-level .repeated-message,\n.console-verbose-level .repeated-message,\n.console-info-level .repeated-message {\n    display: flex;\n}\n\n.console-info {\n    color: rgb(128, 128, 128);\n    font-style: italic;\n    padding-bottom: 2px;\n}\n\n.console-group .console-group > .console-group-messages {\n    margin-left: 16px;\n}\n\n.console-group-title.console-from-api {\n    font-weight: bold;\n}\n\n.console-group-title .console-message {\n    margin-left: 12px;\n}\n\n.expand-group-icon {\n    -webkit-user-select: none;\n    flex: none;\n    background-color: rgb(110, 110, 110);\n    position: relative;\n    left: 10px;\n    top: 5px;\n    margin-right: 2px;\n}\n\n.console-group-title .message-level-icon {\n    display: none;\n}\n\n.console-message-repeat-count .expand-group-icon {\n    left: 2px;\n    top: 2px;\n    background-color: #fff;\n    margin-right: 4px;\n}\n\n.console-group {\n    position: relative;\n}\n\n.console-message-wrapper {\n    display: flex;\n    border-top: 1px solid var(--message-border-color);\n    border-bottom: 1px solid transparent;\n}\n\n.console-message-wrapper:first-of-type {\n    border-top-color: transparent;\n}\n\n.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level):not(.console-warning-level) {\n    border-top-width: 0px;\n}\n\n.console-message-wrapper.console-error-level,\n.console-message-wrapper.console-error-level:not(:focus) + .console-message-wrapper:not(.console-warning-level):not(:focus) {\n    border-top-color: var(--error-border-color);\n}\n\n.console-message-wrapper.console-warning-level,\n.console-message-wrapper.console-warning-level:not(:focus) + .console-message-wrapper:not(.console-error-level):not(:focus) {\n    border-top-color: var(--warning-border-color);\n}\n\n.console-message-wrapper:last-of-type {\n    border-bottom-color: var(--message-border-color);\n}\n\n.console-message-wrapper.console-error-level:last-of-type {\n    border-bottom-color: var(--error-border-color);\n}\n\n.console-message-wrapper.console-warning-level:last-of-type {\n    border-bottom-color: var(--warning-border-color);\n}\n\n.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level):not(.console-warning-level):focus {\n    border-top-width: 1px;\n}\n\n.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level):not(.console-warning-level):focus .console-message {\n    padding-top: 2px;\n    min-height: 16px;\n}\n\n.console-message-wrapper.console-adjacent-user-command-result:not(.console-error-level):not(.console-warning-level):focus .command-result-icon {\n    top: 3px;\n}\n\n.console-message-wrapper:focus,\n.console-message-wrapper:focus:last-of-type {\n    border-top-color: hsl(214, 67%, 88%);\n    border-bottom-color: hsl(214, 67%, 88%);\n    background-color: hsl(214, 48%, 95%);\n}\n\n.console-message-wrapper.console-error-level:focus,\n.console-message-wrapper.console-error-level:focus:last-of-type {\n    --error-text-color: rgb(200, 0, 0);\n}\n\n.-theme-with-dark-background .console-message-wrapper.console-error-level:focus,\n.-theme-with-dark-background .console-message-wrapper.console-error-level:focus:last-of-type {\n    --error-text-color: hsl(0, 100%, 75%);\n}\n\n.-theme-with-dark-background .console-message-wrapper:focus,\n.-theme-with-dark-background .console-message-wrapper:focus:last-of-type {\n    border-top-color: hsl(214, 47%, 48%);\n    border-bottom-color: hsl(214, 47%, 48%);\n    background-color: hsl(214, 19%, 20%);\n}\n\n.console-message-wrapper:focus + .console-message-wrapper {\n    border-top-color: transparent;\n}\n\n.console-message-wrapper .nesting-level-marker {\n    width: 14px;\n    flex: 0 0 auto;\n    border-right: 1px solid #a5a5a5;\n    position: relative;\n    margin-bottom: -1px;\n    margin-top: -1px;\n}\n\n.console-message-wrapper:last-child .nesting-level-marker::before,\n.console-message-wrapper .nesting-level-marker.group-closed::before {\n    content: \"\";\n}\n\n.console-message-wrapper .nesting-level-marker::before {\n    border-bottom: 1px solid #a5a5a5;\n    position: absolute;\n    top: 0;\n    left: 0;\n    margin-left: 100%;\n    width: 3px;\n    height: 100%;\n    box-sizing: border-box;\n}\n\n.console-error-level {\n    background-color: hsl(0, 100%, 97%);\n}\n\n.-theme-with-dark-background .console-error-level {\n    background-color: hsl(0, 100%, 8%);\n}\n\n.console-warning-level {\n    background-color: hsl(50, 100%, 95%);\n}\n\n.-theme-with-dark-background .console-warning-level {\n    background-color: hsl(50, 100%, 10%);\n}\n\n.console-warning-level .console-message-text {\n    color: hsl(39, 100%, 18%);\n}\n\n.console-error-level .console-message-text,\n.console-error-level .console-view-object-properties-section {\n    color: var(--error-text-color) !important;\n}\n\n.console-system-type.console-info-level {\n    color: blue;\n}\n\n.-theme-with-dark-background .console-verbose-level:not(.console-warning-level) .console-message-text,\n.-theme-with-dark-background .console-system-type.console-info-level {\n    color: hsl(220, 100%, 65%) !important;\n}\n\n.console-message.console-warning-level {\n    background-color: rgb(255, 250, 224);\n}\n\n#console-messages .link {\n    text-decoration: underline;\n}\n\n#console-messages .link,\n#console-messages .devtools-link {\n    color: rgb(33%, 33%, 33%);\n    cursor: pointer;\n    word-break: break-all;\n}\n\n#console-messages .link:hover,\n#console-messages .devtools-link:hover {\n    color: rgb(15%, 15%, 15%);\n}\n\n.console-group-messages .section {\n    margin: 0 0 0 12px !important;\n}\n\n.console-group-messages .section > .header {\n    padding: 0 8px 0 0;\n    background-image: none;\n    border: none;\n    min-height: 0;\n}\n\n.console-group-messages .section > .header::before {\n    margin-left: -12px;\n}\n\n.console-group-messages .section > .header .title {\n    color: #222;\n    font-weight: normal;\n    line-height: 13px;\n}\n\n.console-group-messages .section .properties li .info {\n    padding-top: 0;\n    padding-bottom: 0;\n    color: rgb(60%, 60%, 60%);\n}\n\n.console-object-preview {\n    white-space: normal;\n    word-wrap: break-word;\n    font-style: italic;\n}\n\n.console-object-preview .name {\n    /* Follows .section .properties .name, .event-properties .name */\n    color: rgb(136, 19, 145);\n    flex-shrink: 0;\n}\n\n.console-message-text .object-value-string,\n.console-message-text .object-value-regexp,\n.console-message-text .object-value-symbol {\n    white-space: pre-wrap;\n    word-break: break-all;\n}\n\n.console-message-formatted-table {\n    clear: both;\n}\n\n.console-message .source-code {\n    line-height: 1.2;\n}\n\n.console-message-anchor {\n    float: right;\n    text-align: right;\n    max-width: 100%;\n    margin-left: 4px;\n}\n\n.console-message-badge {\n    float: right;\n    margin-left: 4px;\n}\n\n.console-message-nowrap-below,\n.console-message-nowrap-below div,\n.console-message-nowrap-below span {\n    white-space: nowrap !important;\n}\n\n.object-state-note {\n    display: inline-block;\n    width: 11px;\n    height: 11px;\n    color: white;\n    text-align: center;\n    border-radius: 3px;\n    line-height: 13px;\n    margin: 0 6px;\n    font-size: 9px;\n}\n\n.-theme-with-dark-background .object-state-note {\n    background-color: hsl(230, 100%, 80%);\n}\n\n.info-note {\n    background-color: rgb(179, 203, 247);\n}\n\n.info-note::before {\n    content: \"i\";\n}\n\n.console-view-object-properties-section:not(.expanded) .info-note {\n    display: none;\n}\n\n.console-view-object-properties-section {\n    padding: 0px;\n    position: relative;\n    vertical-align: baseline;\n    color: inherit;\n    display: inline-block;\n    overflow-wrap: break-word;\n    max-width: 100%;\n}\n\n.console-object {\n    white-space: pre-wrap;\n    word-break: break-all;\n}\n\n.console-message-stack-trace-toggle {\n    display: flex;\n    flex-direction: row;\n    align-items: flex-start;\n}\n\n.console-message-stack-trace-wrapper {\n    flex: 1 1 auto;\n    display: flex;\n    flex-direction: column;\n    align-items: stretch;\n}\n\n.console-message-stack-trace-wrapper > * {\n    flex: none;\n}\n\n.console-message-expand-icon {\n    margin-bottom: -2px;\n}\n\n.console-searchable-view {\n    max-height: 100%;\n}\n\n.console-view-pinpane {\n    flex: none;\n    max-height: 200px;\n}\n\n/*# sourceURL=console/consoleView.css */";