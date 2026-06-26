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
	    }
	}

}

