export default interface Cache {
    Version: number
    Maps: Record<string, CacheMap>
}

export interface CacheMap {
    Id: string
    Title: string
    Artist: string
    Mapper?: string
    Difficulty?: number
    DifficultyString?: string
    WriteTime: number
    Audio: string
    FileName: string
}