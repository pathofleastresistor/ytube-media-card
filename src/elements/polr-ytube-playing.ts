import { LitElement, html, css, CSSResultGroup, PropertyValueMap } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../elements/polr-ytube-list";
import { PoLRYTubeList } from "../elements/polr-ytube-list";
import { FetchableMediaContentType, PoLRYTubeListState } from "../utils/utils";

@customElement("polr-ytube-playing")
export class PoLRYTubePlaying extends LitElement {
    @state() public _hass: any;
    @state() public _entity: any;
    @state() private _polrYTubeList: PoLRYTubeList;

    protected firstUpdated(_changedProperties): void {
        this._polrYTubeList = this.renderRoot.querySelector("polr-ytube-list");
        this._getCurrentlyPlayingItems();
    }

    render() {
        return html`
            <polr-ytube-list
                .hass=${this._hass}
                .entity=${this._entity}
            ></polr-ytube-list>
        `;
    }

    async _getCurrentlyPlayingItems() {
        let media_content_type = this._entity?.attributes?.media_content_type;
        let _media_type = this._entity?.attributes?._media_type;
        let results: any = {};
        if (this._entity?.state == "idle") return;

        try {
            if (
                FetchableMediaContentType.includes(media_content_type)
            ) {
                results = await this._hass.callWS({
                    type: "media_player/browse_media",
                    entity_id: this._entity["entity_id"],
                    media_content_type: "cur_playlists",
                    media_content_id: "",
                });
            }

            if (this._entity?.attributes?.media_title == "loading...") {
                this._polrYTubeList.state = PoLRYTubeListState.LOADING;
                return;
            }

            if (results?.children?.length > 0) {
                this._polrYTubeList.elements = results.children;
                this._polrYTubeList.state = PoLRYTubeListState.HAS_RESULTS;
            } else {
                //this._polrYTubeList.elements = [];
                //this._polrYTubeList.state = PoLRYTubeListState.NO_RESULTS;
            }
            this.requestUpdate();
        } catch (e) {
            console.error(e);
            this._polrYTubeList.state = PoLRYTubeListState.ERROR;
        }
    }

    public refresh(entity) {
        if (entity != null) this._entity = entity;
        this._getCurrentlyPlayingItems();
    }

    static styles = css``;
}
