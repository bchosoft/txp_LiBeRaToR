export namespace main {
	
	export class DropResult {
	    files: string[];
	    folder: string;
	    defaultDest: string;
	
	    static createFrom(source: any = {}) {
	        return new DropResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.files = source["files"];
	        this.folder = source["folder"];
	        this.defaultDest = source["defaultDest"];
	    }
	}
	export class FileSelectionResult {
	    files: string[];
	    defaultDest: string;
	
	    static createFrom(source: any = {}) {
	        return new FileSelectionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.files = source["files"];
	        this.defaultDest = source["defaultDest"];
	    }
	}
	export class FolderSelectionResult {
	    folder: string;
	    defaultDest: string;
	
	    static createFrom(source: any = {}) {
	        return new FolderSelectionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folder = source["folder"];
	        this.defaultDest = source["defaultDest"];
	    }
	}
	export class LicenseInfo {
	    unlocked: boolean;
	    token: string;
	    hwid: string;
	    donateUrl: string;
	    freeLimit: number;
	    activeLimit: number;
	    monetizationEnabled: boolean;
	    donateButton: boolean;
	    overlay: boolean;
	    restrictions: boolean;
	    offlineMode: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LicenseInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.unlocked = source["unlocked"];
	        this.token = source["token"];
	        this.hwid = source["hwid"];
	        this.donateUrl = source["donateUrl"];
	        this.freeLimit = source["freeLimit"];
	        this.activeLimit = source["activeLimit"];
	        this.monetizationEnabled = source["monetizationEnabled"];
	        this.donateButton = source["donateButton"];
	        this.overlay = source["overlay"];
	        this.restrictions = source["restrictions"];
	        this.offlineMode = source["offlineMode"];
	    }
	}
	export class MonetizationConfig {
	    monetizationEnabled: boolean;
	    donateButton: boolean;
	    overlay: boolean;
	    restrictions: boolean;
	    offlineMode: boolean;
	    activeLimit: number;
	
	    static createFrom(source: any = {}) {
	        return new MonetizationConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.monetizationEnabled = source["monetizationEnabled"];
	        this.donateButton = source["donateButton"];
	        this.overlay = source["overlay"];
	        this.restrictions = source["restrictions"];
	        this.offlineMode = source["offlineMode"];
	        this.activeLimit = source["activeLimit"];
	    }
	}

}

