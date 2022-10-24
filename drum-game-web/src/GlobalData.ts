import { fetchEndpoint } from "./api/network";
import Cache from "./interfaces/Cache";
import SMuFL from "./interfaces/SMuFL";

interface CacheDef {
    mapList: Cache
    dtxMapList: Cache
    bravura: SMuFL
}

class GlobalData {
    constructor() {
    }

    GlobalCache: { [K in keyof CacheDef]?: Promise<CacheDef[K]> } = {}

    private LoadCacheItem<K extends keyof CacheDef>(key: K, url: string, process?: (res: CacheDef[K]) => void) {
        if (!this.GlobalCache[key]) {
            // @ts-ignore
            this.GlobalCache[key] = fetchEndpoint<CacheDef[K]>(url).then(r => {
                if (r) {
                    process?.(r);
                    return r;
                }
                throw new Error(`Failed to load ${key}`)
            })
        }
        return this.GlobalCache[key]!;
    }

    LoadMapList() {
        return this.LoadCacheItem("mapList", "/maps.json", GlobalData.ProcessMaps);
    }

    private static ProcessMaps(res: Cache) {
        // just do some basic post processing here
        const maps = res.Maps;
        for (const key in maps) {
            const map = maps[key];
            map.FileName = key;
            map.Id ??= key;
        }
    }

    DtxMapList() {
        return this.LoadCacheItem("dtxMapList", "/dtx-maps.json", GlobalData.ProcessMaps)
    }

    LoadBravura() {
        return this.LoadCacheItem("bravura", "/bravura_metadata.json")
    }
}

export default new GlobalData();