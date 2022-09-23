import Component from "../framework/Component";
import { RegisterListener, RemoveListener } from "../framework/Framework";
import { CacheMap } from "../interfaces/Cache";
import { Clamp, ExpLerp, Filter } from "../utils/Util";
import BeatmapCard from "./BeatmapCard";
import Search from "./Search";


const circleY = 800;
const circleX = 350;

export default class MapCarousel extends Component { // could merge this back with VirtualizedContainer eventually

    ItemHeight: number
    Items: CacheMap[] = [];
    FilteredMaps: CacheMap[] = []

    TotalHeight: number = 0;

    Renderer: new (item: CacheMap) => BeatmapCard;

    Free: BeatmapCard[] = [];

    Active: Set<BeatmapCard> = new Set();
    ActiveMap: Map<CacheMap, BeatmapCard> = new Map();

    private _selectedIndex: number = 0;

    Dragging = false;

    get SelectedIndex() { return this._selectedIndex; }
    set SelectedIndex(value: number) {
        this.TargetScroll = value * this.ItemHeight;
        this._selectedIndex = Clamp(value, 0, this.FilteredMaps.length - 1);
    }
    get SelectedMap() { return this.FilteredMaps[this._selectedIndex] }

    get SelectedMapPosition() { return this._selectedIndex * this.ItemHeight; }

    TargetScroll: number = 0;
    CurrentScroll: number = 0; // this is like scrollTop
    UserTargetScroll: number = 0;
    LoadedScroll: number = Number.NaN;

    Search = new Search();

    Render(item: CacheMap) {
        if (this.Free.length > 0) {
            const pop = this.Free.pop()!;
            pop.SetContent(item);
            return pop;
        }
        return new this.Renderer(item);
    }

    constructor(renderer: new (item: CacheMap) => BeatmapCard, itemHeight: number) {
        super();
        this.Renderer = renderer;
        this.ItemHeight = itemHeight;
        this.HTMLElement = <div className="map-selector" />
        this.Search.OnChange = this.OnSearch;

        this.Add(this.Search);
    }

    OnSearch = (value: string) => {
        const selected = this.SelectedMap;
        this.FilteredMaps = Filter(value, this.Items);
        this.Search.UpdateNumbers(this.FilteredMaps.length, this.Items.length);
        let newIndex = -1;
        if (selected)
            newIndex = this.FilteredMaps.indexOf(selected);
        if (newIndex === -1)
            newIndex = Math.floor(Math.random() * this.FilteredMaps.length);
        this.HardPull(newIndex);
        this.Update();
    }

    HardPull(index: number) {
        this._selectedIndex = index;
        this.CurrentScroll = this.TargetScroll = this.SelectedMapPosition;
    }

    AfterRemove() {
        super.AfterRemove()
        RemoveListener("newframe", this.UpdateScroll)
        RemoveListener("wheel", this.OnWheel);
    }

    AfterDOM() {
        super.AfterDOM();
        RegisterListener("newframe", this.UpdateScroll);
        RegisterListener("wheel", this.OnWheel);
        this.Update();
    }

    UpdateScroll = (dt: number) => {
        if (!this.Dragging) {
            // pulls the target to the nearest card
            this.TargetScroll = ExpLerp(this.TargetScroll, this.SelectedMapPosition, 0.99, dt, 0.01);
        }
        const newScroll = ExpLerp(this.CurrentScroll, this.TargetScroll, 0.99, dt, 0.02)
        this.CurrentScroll = newScroll;
        if (this.CurrentScroll === this.LoadedScroll) return;
        this.Update();
    }

    OnWheel = (e: WheelEvent) => {
        this.SelectedIndex += Math.sign(e.deltaY)
    }

    OnKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Home" && e.ctrlKey)
            this.SelectedIndex = 0;
        else if (e.key === "End" && e.ctrlKey)
            this.SelectedIndex = this.FilteredMaps.length - 1;
        else if (e.key === "PageUp")
            this.SelectedIndex -= Math.round(this.HTMLElement.clientHeight / this.ItemHeight);
        else if (e.key === "PageDown")
            this.SelectedIndex += Math.round(this.HTMLElement.clientHeight / this.ItemHeight);
        else if (e.key === "ArrowDown")
            this.SelectedIndex += 1;
        else if (e.key === "ArrowUp")
            this.SelectedIndex -= 1;
        else if (e.key === "F2")
            this.SelectedIndex = Math.floor(Math.random() * this.FilteredMaps.length);
        else return;
        e.preventDefault();
    }

    Select(e: CacheMap) {
        this.SelectedIndex = this.FilteredMaps.indexOf(e);
    }

    Update() {
        this.LoadedScroll = this.CurrentScroll;
        const clientHeight = this.HTMLElement.clientHeight;
        const itemHeight = this.ItemHeight;
        const scroll = this.CurrentScroll;

        const visibleStart = this.CurrentScroll - (clientHeight - itemHeight) * 0.5;
        const visibleEnd = visibleStart + clientHeight;

        const renderStart = Math.max(0, Math.floor(visibleStart / itemHeight));
        const renderEnd = Math.min(this.FilteredMaps.length, Math.ceil(visibleEnd / itemHeight)) // exclusive

        const selected = this.SelectedIndex;

        const pendingFree = this.Active; // tentatively free all active renderers
        let newActive = new Set<BeatmapCard>();
        for (let i = renderStart; i < renderEnd; i++) {
            const e = this.FilteredMaps[i];
            const renderer = this.ActiveMap.get(e);
            if (renderer) {
                renderer.Selected = i === selected;

                const y = i * itemHeight - scroll;
                renderer.HTMLElement.style.top = y + (clientHeight - itemHeight) * 0.5 + "px";

                const clampedY = Clamp(y / circleY, -1, 1);
                renderer.HTMLElement.style.right = ((Math.cos(clampedY * Math.PI / 2) - 1) * circleX) + "px";

                newActive.add(renderer);
                pendingFree.delete(renderer);
            }
        }
        for (const e of pendingFree) {
            e.Kill();
            this.ActiveMap.delete(e.CurrentItem);
            this.Free.push(e);
        }

        for (let i = renderStart; i < renderEnd; i++) {
            const e = this.FilteredMaps[i];
            if (!this.ActiveMap.get(e)) {
                const newItem = this.Render(e);
                newItem.Selected = i === selected;

                const y = i * itemHeight - scroll;
                newItem.HTMLElement.style.top = y + (clientHeight - itemHeight) * 0.5 + "px";

                const clampedY = Clamp(y / circleY, -1, 1);
                newItem.HTMLElement.style.right = ((Math.cos(clampedY * Math.PI / 2) - 1) * circleX) + "px";


                this.ActiveMap.set(e, newItem);
                this.Add(newItem);
                newActive.add(newItem);
            }
        }

        this.Active = newActive;
    }

    OnPageResize = () => {
        this.Update();
    }

    SetItems(items: CacheMap[]) {
        this.Items = items.sort((a, b) => a.Difficulty - b.Difficulty);
        this.OnSearch(this.Search.Value);
        if (this.Alive) this.Update();
    }
}