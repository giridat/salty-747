class AS3X extends NavSystem {
    constructor() {
        super(...arguments);
        this.pageListElems = [];
    }
    get IsGlassCockpit() { return true; }
    connectedCallback() {
        super.connectedCallback();
        this.contentElement = this.getChildById("Content");
        this.pagesContainer = this.getChildById("MFD");
        this.currentPageElement = this.getChildById("currentPageName");
        this.pageListElement = this.getChildById("pageList");
        this.addEventAlias("TURN_INC", "NavigationSmallInc");
        this.addEventAlias("TURN_DEC", "NavigationSmallDec");
        this.addEventAlias("JOYSTICK_DOWN", "NavigationLargeInc");
        this.addEventAlias("JOYSTICK_UP", "NavigationLargeDec");
        this.addEventAlias("JOYSTICK_RIGHT", "NavigationLargeInc");
        this.addEventAlias("JOYSTICK_LEFT", "NavigationLargeDec");
        this.addEventAlias("JOYSTICK_PUSH", "NavigationPush");
        this.addIndependentElementContainer(new NavSystemElementContainer("Softkeys", "Softkeys", new SoftKeys()));
    }
    parseXMLConfig() {
        super.parseXMLConfig();
        let state = "PFD";
        if (this.instrumentXmlConfig) {
            let displayModeConfig = this.instrumentXmlConfig.getElementsByTagName("DisplayMode");
            if (displayModeConfig.length > 0) {
                state = displayModeConfig[0].textContent;
                diffAndSetAttribute(this.contentElement, "state", state);
            }
        }
        switch (state) {
            case "PFD":
                this.pageGroups = [
                    new NavSystemPageGroup("Main", this, [
                        new AS3X_PFD()
                    ]),
                ];
                this.mapInstrument = new MapInstrumentElement();
                this.mapInstrument.setGPS(this);
                this.warnings = new PFD_Warnings();
                this.addIndependentElementContainer(new NavSystemElementContainer("Airspeed", "PFD", new PFD_Airspeed()));
                this.addIndependentElementContainer(new NavSystemElementContainer("Altimeter", "PFD", new PFD_Altimeter()));
                this.addIndependentElementContainer(new NavSystemElementContainer("SimpleCompass", "PFD", new PFD_SimpleCompass()));
                this.addIndependentElementContainer(new NavSystemElementContainer("CDI", "PFD", new PFD_CDI()));
                this.addIndependentElementContainer(new NavSystemElementContainer("MapInstrument", "PFD", this.mapInstrument));
                this.addIndependentElementContainer(new NavSystemElementContainer("Attitude", "PFD", new PFD_Attitude()));
                this.addIndependentElementContainer(new NavSystemElementContainer("Warnings", "Warnings", this.warnings));
                this.addIndependentElementContainer(new NavSystemElementContainer("Autopilot", "AutopilotInfos", new PFD_AutopilotDisplay()));
                this.addIndependentElementContainer(new NavSystemElementContainer("Engine", "Engine", new GlassCockpit_XMLEngine()));
                this.addIndependentElementContainer(new NavSystemElementContainer("TopBar", "TopBar", new AS3X_TopBar()));
                this.addEventLinkedPopupWindow(new NavSystemEventLinkedPopUpWindow("DirectTo", "DirectToWindow", new GlassCockpit_DirectTo(), "DIRECTTO"));
                this.gsValue = this.getChildById("GS_Value");
                this.addEventLinkedPageGroup("FPL_Push", new NavSystemPageGroup("Flightplan", this, [
                    new AS3X_AFPL_Page(9)
                ]));
                this.addEventLinkedPageGroup("NRST_Push", new NavSystemPageGroup("Nearest", this, [
                    new AS3X_PFD_NearestAirport(),
                    new AS3X_NearestVOR(6),
                    new AS3X_NearestNDB(6),
                    new AS3X_NearestIntersection(6)
                ]));
                this.proceduresPage = new NavSystemElementContainer("Procedures", "ProceduresWindow", new MFD_Procedures(0, 0, 0));
                this.proceduresPage.setGPS(this);
                break;
            case "Split":
                this.warnings = new PFD_Warnings();
                this.addIndependentElementContainer(new AS3X_PFD());
                this.addIndependentElementContainer(new NavSystemElementContainer("Warnings", "Warnings", this.warnings));
            case "MFD":
                this.pageGroups = [
                    new NavSystemPageGroup("Main", this, [
                        new AS3X_MapPage()
                    ]),
                ];
                this.addIndependentElementContainer(new NavSystemElementContainer("Engine", "Engine", new GlassCockpit_XMLEngine()));
                this.addIndependentElementContainer(new NavSystemElementContainer("TopBar", "TopBar", new AS3X_TopBar()));
                this.addEventLinkedPopupWindow(new NavSystemEventLinkedPopUpWindow("DirectTo", "DirectToWindow", new GlassCockpit_DirectTo(), "DIRECTTO"));
                this.addEventLinkedPageGroup("FPL_Push", new NavSystemPageGroup("Flightplan", this, [
                    new AS3X_AFPL_Page()
                ]));
                this.addEventLinkedPageGroup("NRST_Push", new NavSystemPageGroup("Nearest", this, [
                    new AS3X_NearestAirport(),
                    new AS3X_NearestVOR(),
                    new AS3X_NearestNDB(),
                    new AS3X_NearestIntersection()
                ]));
                this.proceduresPage = new NavSystemElementContainer("Procedures", "ProceduresWindow", new MFD_Procedures(4, 5, 5));
                this.proceduresPage.setGPS(this);
                break;
        }
    }
    Update() {
        super.Update();
        diffAndSetText(this.currentPageElement, this.getCurrentPage().detailedName);
        let currPageGroup = this.getCurrentPageGroup();
        for (let i = 0; i < currPageGroup.pages.length; i++) {
            if (i >= this.pageListElems.length) {
                let elem = window.document.createElement("div");
                diffAndSetAttribute(elem, "class", "pageElem");
                this.pageListElems.push(elem);
                this.pageListElement.appendChild(elem);
            }
            diffAndSetText(this.pageListElems[i], currPageGroup.pages[i].shortName);
            if (i == currPageGroup.pageIndex) {
                diffAndSetAttribute(this.pageListElems[i], "state", "Active");
            }
            else {
                diffAndSetAttribute(this.pageListElems[i], "state", "Inactive");
            }
        }
        for (let i = currPageGroup.pages.length; i < this.pageListElems.length; i++) {
            diffAndSetText(this.pageListElems[i], "");
        }
        if (this.gsValue) {
            diffAndSetText(this.gsValue, fastToFixed(SimVar.GetSimVarValue("GPS GROUND SPEED", "knot"), 0) + "kt");
        }
    }
    get templateID() { return "AS3X"; }
    reboot() {
        super.reboot();
        if (this.warnings)
            this.warnings.reset();
    }
}
class AS3X_Page extends NavSystemPage {
    constructor(_name, _htmlElemId, _element, _shortName = "", _detailedName = "") {
        super(_name, _htmlElemId, _element);
        this.shortName = _shortName;
        this.detailedName = _detailedName != "" ? _detailedName : _name;
    }
}
class AS3X_PFD extends AS3X_Page {
    constructor() {
        super("PFD", "PFD", null, "PFD");
        this.valueSelectionMode = 0;
        this.syntheticVision = true;
        this.element = new NavSystemElementGroup([
            new PFD_Compass("HSI"),
            new PFD_Minimums(),
        ]);
    }
    init() {
        super.init();
        this.oatValue = this.gps.getChildById("OAT_Value");
        this.lclValue = this.gps.getChildById("LCL_Value");
        this.mainSoftkeyMenu = new SoftKeysMenu();
        this.mainSoftkeyMenu.elements = [
            new SoftKeyElement("HDG", this.switchToValueSelectionMode.bind(this, 1), this.valueSelectionModeStateCallback.bind(this, 1)),
            new SoftKeyElement("CRS", this.switchToValueSelectionMode.bind(this, 2), this.valueSelectionModeStateCallback.bind(this, 2)),
            new SoftKeyElement("CDI SRC", this.switchCdiSrc.bind(this)),
            new SoftKeyElement("BARO", this.switchToBaroMenu.bind(this)),
            new SoftKeyElement("ALT", this.switchToValueSelectionMode.bind(this, 3), this.valueSelectionModeStateCallback.bind(this, 3))
        ];
        this.baroSoftkeyMenu = new SoftKeysMenu();
        this.baroSoftkeyMenu.elements = [
            new SoftKeyElement(""),
            new SoftKeyElement(""),
            new SoftKeyElement("MINIMUMS", this.switchToMinimums.bind(this), this.valueSelectionModeStateCallback.bind(this, 4)),
            new SoftKeyElement("BARO", this.switchToValueSelectionMode.bind(this, 5), this.valueSelectionModeStateCallback.bind(this, 5)),
            new SoftKeyElement("BACK", this.switchFromBaroMenu.bind(this))
        ];
        this.softKeys = this.mainSoftkeyMenu;
        this.syntheticVisionMenuElement = new ContextualMenuElement("Synthetic Vision On", this.toggleSyntheticVision.bind(this));
        this.defaultMenu = new ContextualMenu("Page Menu", [
            this.syntheticVisionMenuElement
        ]);
        this.syntheticVisionElement = this.gps.getChildById("SyntheticVision");
        if (this.gps.instrumentXmlConfig) {
            let altimeterIndexElems = this.gps.instrumentXmlConfig.getElementsByTagName("AltimeterIndex");
            if (altimeterIndexElems.length > 0) {
                this.altimeterIndex = parseInt(altimeterIndexElems[0].textContent) + 1;
            }
        }
        SimVar.SetSimVarValue("K:TOGGLE_GPS_DRIVES_NAV1", "Bool", 0);
    }
    switchToValueSelectionMode(_value) {
        if (_value == this.valueSelectionMode) {
            this.valueSelectionMode = 0;
        }
        else {
            this.valueSelectionMode = _value;
        }
    }
    toggleSyntheticVision() {
        this.syntheticVision = !this.syntheticVision;
        let attitude = this.gps.getElementOfType(PFD_Attitude);
        if (attitude) {
            diffAndSetAttribute(attitude.svg, "background", (this.syntheticVision ? "false" : "true"));
        }
        if (this.syntheticVisionElement) {
            diffAndSetStyle(this.syntheticVisionElement, StyleProperty.display, (this.syntheticVision ? "Block" : "None"));
        }
        diffAndSetStyle(this.syntheticVisionElement, StyleProperty.display, (this.syntheticVision ? "Block" : "None"));
        this.syntheticVisionMenuElement.name = "Synthetic Vision " + (this.syntheticVision ? "On" : "Off");
    }
    valueSelectionModeStateCallback(_value) {
        if (_value == this.valueSelectionMode) {
            return "Active";
        }
        else {
            return "None";
        }
    }
    switchToBaroMenu() {
        this.switchToMenu(this.baroSoftkeyMenu);
        this.valueSelectionMode = 5;
    }
    switchFromBaroMenu() {
        this.switchToMenu(this.mainSoftkeyMenu);
        this.valueSelectionMode = 0;
    }
    switchToMenu(_menu) {
        this.softKeys = _menu;
    }
    switchCdiSrc() {
        let isGPSDrived = SimVar.GetSimVarValue("GPS DRIVES NAV1", "Bool");
        let cdiSrc = isGPSDrived ? 3 : Simplane.getAutoPilotSelectedNav();
        cdiSrc = (cdiSrc % 3) + 1;
        if (cdiSrc == 2 && !SimVar.GetSimVarValue("NAV AVAILABLE:2", "Bool")) {
            cdiSrc = 3;
        }
        if (cdiSrc == 3 != isGPSDrived) {
            SimVar.SetSimVarValue("K:TOGGLE_GPS_DRIVES_NAV1", "Bool", 0);
        }
        if (cdiSrc != 3) {
            Simplane.setAutoPilotSelectedNav(cdiSrc);
        }
    }
    switchToMinimums() {
        this.switchToValueSelectionMode(4);
        if (this.valueSelectionMode == 4) {
            if (SimVar.GetSimVarValue("L:AS3000_MinimalsMode", "number") == 0) {
                SimVar.SetSimVarValue("L:AS3000_MinimalsMode", "number", 1);
            }
        }
    }
    onUpdate(_deltaTime) {
        super.onUpdate(_deltaTime);
        diffAndSetText(this.oatValue, fastToFixed(SimVar.GetSimVarValue("AMBIENT TEMPERATURE", "celsius"), 0) + "°C");
        let lcl = SimVar.GetSimVarValue("E:LOCAL TIME", "seconds");
        let hh = Math.floor(lcl / 3600);
        let mm = Math.floor((lcl % 3600) / 60);
        let ss = Math.floor(lcl % 60);
        diffAndSetText(this.lclValue, (hh < 10 ? "0" : "") + hh + (mm < 10 ? ":0" : ":") + mm + (ss < 10 ? ":0" : ":") + ss);
    }
    onEvent(_event) {
        super.onEvent(_event);
        switch (_event) {
            case "TURN_INC":
                switch (this.valueSelectionMode) {
                    case 1:
                        SimVar.SetSimVarValue("K:HEADING_BUG_INC", "number", 0);
                        break;
                    case 2:
                        SimVar.SetSimVarValue("K:VOR1_OBI_INC", "number", 0);
                        break;
                    case 3:
                        SimVar.SetSimVarValue("K:AP_ALT_VAR_INC", "number", 0);
                        break;
                    case 4:
                        SimVar.SetSimVarValue("L:AS3000_MinimalsValue", "number", Math.min(SimVar.GetSimVarValue("L:AS3000_MinimalsValue", "number") + 10, 16000));
                        break;
                    case 5:
                        SimVar.SetSimVarValue("K:KOHLSMAN_INC", "number", this.altimeterIndex);
                        break;
                }
                break;
            case "TURN_DEC":
                switch (this.valueSelectionMode) {
                    case 1:
                        SimVar.SetSimVarValue("K:HEADING_BUG_DEC", "number", 0);
                        break;
                    case 2:
                        SimVar.SetSimVarValue("K:VOR1_OBI_DEC", "number", 0);
                        break;
                    case 3:
                        SimVar.SetSimVarValue("K:AP_ALT_VAR_DEC", "number", 0);
                        break;
                    case 4:
                        SimVar.SetSimVarValue("L:AS3000_MinimalsValue", "number", Math.max(SimVar.GetSimVarValue("L:AS3000_MinimalsValue", "number") - 10, 0));
                        break;
                    case 5:
                        SimVar.SetSimVarValue("K:KOHLSMAN_DEC", "number", this.altimeterIndex);
                        break;
                }
                break;
            case "CLR":
                if (this.valueSelectionMode == 4) {
                    SimVar.SetSimVarValue("L:AS3000_MinimalsMode", "number", 0);
                }
                break;
        }
    }
}
class AS3X_TopBar extends NavSystemElement {
    init(root) {
        let info1 = this.gps.getChildById("TopInfo1");
        let info2 = this.gps.getChildById("TopInfo2");
        let info3 = this.gps.getChildById("TopInfo3");
        let info4 = this.gps.getChildById("TopInfo4");
        this.title1 = info1.getElementsByClassName("title")[0];
        this.title2 = info2.getElementsByClassName("title")[0];
        this.title3 = info3.getElementsByClassName("title")[0];
        this.title4 = info4.getElementsByClassName("title")[0];
        this.value1 = info1.getElementsByClassName("value")[0];
        this.value2 = info2.getElementsByClassName("value")[0];
        this.value3 = info3.getElementsByClassName("value")[0];
        this.value4 = info4.getElementsByClassName("value")[0];
    }
    onEnter() {
    }
    onUpdate(_deltaTime) {
        let wp = SimVar.GetSimVarValue("GPS WP NEXT ID", "string");
        diffAndSetText(this.value1, wp != "" ? wp : "____");
        let brg = SimVar.GetSimVarValue("GPS WP BEARING", "degrees");
        diffAndSetText(this.value2, brg > 0 ? fastToFixed(brg, 0) + "°M" : "___°M");
        let dist = SimVar.GetSimVarValue("GPS WP DISTANCE", "nautical mile");
        diffAndSetText(this.value3, dist > 0 ? fastToFixed(dist, 1) + "NM" : "__._NM");
        let ete = SimVar.GetSimVarValue("GPS ETE", "minutes");
        let hh = Math.floor(ete / 60);
        let mm = Math.floor(ete % 60);
        diffAndSetText(this.value4, ete > 0 ? (hh < 10 ? "0" : "") + hh + (mm < 10 ? ":0" : ":") + mm : "__:__");
    }
    onExit() {
    }
    onEvent(_event) {
    }
}
class AS3X_AFPL_Page extends AS3X_Page {
    constructor(_nbLines = 16) {
        super("Active Flight Plan", "ActiveFlightPlan", new MFD_ActiveFlightPlan_Element(MFD_WaypointLine, MFD_ApproachWaypointLine, _nbLines), "ACTV", "ACTIVE FLIGHT PLAN");
    }
    init() {
        this.softKeys = new SoftKeysMenu();
        this.softKeys.elements = [
            new SoftKeyElement(""),
            new SoftKeyElement("PROC", this.toggleProc.bind(this)),
            new SoftKeyElement(""),
            new SoftKeyElement(""),
            new SoftKeyElement("EXIT", this.gps.exitEventLinkedPageGroup.bind(this.gps))
        ];
    }
    toggleProc() {
        if (this.gps.popUpElement) {
            this.gps.closePopUpElement();
        }
        else {
            this.gps.switchToPopUpPage(this.gps.proceduresPage);
        }
    }
}
class AS3X_NearestAirport extends AS3X_Page {
    constructor(_nbLines = 5, _nbFreqs = 3) {
        super("NEAREST AIRPORTS", "Nrst_Airport", new MFD_NearestAirport_Element(_nbLines, _nbFreqs), "APT", "NEAREST");
    }
    init() {
        this.softKeys = new SoftKeysMenu();
        this.aptSoftkey = new SoftKeyElement("APT", this.activateApt.bind(this));
        this.rnwySoftkey = new SoftKeyElement("RNWY", this.activateRnwy.bind(this));
        this.freqSoftkey = new SoftKeyElement("FREQ", this.activateFreq.bind(this));
        this.aprSoftkey = new SoftKeyElement("APR", this.activateApr.bind(this));
        this.softKeys.elements = [
            this.aptSoftkey,
            this.rnwySoftkey,
            this.freqSoftkey,
            this.aprSoftkey,
            new SoftKeyElement("EXIT", this.gps.exitEventLinkedPageGroup.bind(this.gps))
        ];
    }
    onUpdate(_deltaTime) {
        if (this.gps.currentInteractionState == 0) {
            this.reinitSoftkeys();
        }
        return super.onUpdate(_deltaTime);
    }
    reinitSoftkeys() {
        this.aptSoftkey.state = "None";
        this.rnwySoftkey.state = "None";
        this.freqSoftkey.state = "None";
        this.aprSoftkey.state = "None";
    }
    activateApt() {
        this.element.aptSelect();
        this.reinitSoftkeys();
        this.aptSoftkey.state = "Active";
    }
    activateRnwy() {
        this.element.rnwySelect();
        this.reinitSoftkeys();
        this.rnwySoftkey.state = "Active";
    }
    activateFreq() {
        this.element.freqSelect();
        this.reinitSoftkeys();
        this.freqSoftkey.state = "Active";
    }
    activateApr() {
        this.element.aprSelect();
        this.reinitSoftkeys();
        this.aprSoftkey.state = "White";
    }
}
class AS3X_PFD_NearestAirport extends AS3X_NearestAirport {
    constructor() {
        super(3, 1);
    }
    init() {
        this.softKeys = new SoftKeysMenu();
        this.aptSoftkey = new SoftKeyElement("APT", this.activateApt.bind(this));
        this.rnwySoftkey = new SoftKeyElement("RNWY", this.activateRnwy.bind(this));
        this.freqSoftkey = new SoftKeyElement("FREQ", this.activateFreq.bind(this));
        this.aprSoftkey = new SoftKeyElement("");
        this.softKeys.elements = [
            this.aptSoftkey,
            this.rnwySoftkey,
            this.freqSoftkey,
            this.aprSoftkey,
            new SoftKeyElement("EXIT", this.gps.exitEventLinkedPageGroup.bind(this.gps))
        ];
    }
}
class AS3X_NearestVOR extends AS3X_Page {
    constructor(_nbLines = 10) {
        super("NEAREST VOR", "Nrst_VOR", new MFD_NearestVOR_Element(_nbLines), "VOR", "NEAREST");
    }
    init() {
        this.vorSoftKey = new SoftKeyElement("VOR", this.activateVor.bind(this));
        this.freqSoftKey = new SoftKeyElement("FREQ", this.activateFreq.bind(this));
        this.softKeys = new SoftKeysMenu();
        this.softKeys.elements = [
            new SoftKeyElement("", null),
            this.vorSoftKey,
            this.freqSoftKey,
            new SoftKeyElement("", null),
            new SoftKeyElement("EXIT", this.gps.exitEventLinkedPageGroup.bind(this.gps))
        ];
    }
    onUpdate(_deltaTime) {
        if (this.gps.currentInteractionState == 0) {
            this.reinitSoftkeys();
        }
        return super.onUpdate(_deltaTime);
    }
    reinitSoftkeys() {
        this.vorSoftKey.state = "None";
        this.freqSoftKey.state = "None";
    }
    activateVor() {
        this.element.vorSelect();
        this.reinitSoftkeys();
        this.vorSoftKey.state = "Active";
    }
    activateFreq() {
        this.element.freqSelect();
        this.reinitSoftkeys();
        this.freqSoftKey.state = "Active";
    }
}
class AS3X_NearestNDB extends AS3X_Page {
    constructor(_nbLines = 10) {
        super("NEAREST NDB", "Nrst_NDB", new MFD_NearestNDB_Element(_nbLines), "NDB", "NEAREST");
    }
    init() {
    }
}
class AS3X_NearestIntersection extends AS3X_Page {
    constructor(_nbLines = 10) {
        super("NEAREST INTERSECTIONS", "Nrst_Intersections", new MFD_NearestIntersection_Element(_nbLines), "INT", "NEAREST");
    }
    init() {
    }
}
class AS3X_MapPage extends AS3X_Page {
    constructor() {
        super("Map", "Map", new MapInstrumentElement(), "Map", "Map");
    }
    init() {
        this.softKeys = new SoftKeysMenu();
        this.softKeys.elements = [
            new SoftKeyElement(""),
            new SoftKeyElement(""),
            new SoftKeyElement(""),
            new SoftKeyElement(""),
            new SoftKeyElement("")
        ];
    }
    onEvent(_event) {
        super.onEvent(_event);
        switch (_event) {
            case "TURN_INC":
                this.element.onEvent("RANGE_INC");
                break;
            case "TURN_DEC":
                this.element.onEvent("RANGE_DEC");
                break;
        }
    }
}
registerInstrument("as3x-element", AS3X);
//# sourceMappingURL=AS3X.js.map