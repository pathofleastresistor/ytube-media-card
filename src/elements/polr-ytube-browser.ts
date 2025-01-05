import {
    LitElement,
    html,
    css,
    CSSResultGroup,
    PropertyValueMap,
    nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { join } from "lit/directives/join.js";
import { map } from "lit/directives/map.js";
import { PoLRYTubeList } from "./polr-ytube-list";
import { PoLRYTubeItem, PoLRYTubeListState } from "../utils/utils";
import { ArrowLeftIcon, CloseIcon } from "../utils/icons";
import "../shared/polr-select";
import "../shared/polr-textfield";

@customElement("polr-ytube-browser")
export class PoLRYTubeBrowser extends LitElement {
    @state() public entity: any;
    @state() public hass: any;
    @property() public initialAction: PoLRYTubeItem;
    @property() public coverNavigation: boolean;
    @state() public initialElements: PoLRYTubeItem;
    @state() private _browseHistory: PoLRYTubeItem[] = [];
    @state() private _previousBrowseHistory: PoLRYTubeItem[] = [];
    @state() private _polrYTubeList: PoLRYTubeList;
    @state() private _searchTextField: any;
    @state() private _isSearchResults: boolean;

    protected updated(
        _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
    ): void {
        if (_changedProperties.has("initialAction")) {
            this._browseHistory = [];
            this._previousBrowseHistory = [];
            this._browse(this.initialAction);
        }
    }

    protected firstUpdated(_changedProperties): void {
        this._polrYTubeList = this.renderRoot.querySelector("polr-ytube-list");
        this._searchTextField = this.renderRoot.querySelector("#query");
    }

    render() {
        return html`
            <div class="container">
                ${this._renderSearch()} ${this._renderNavigation()}
                ${this._renderPlay()}
                <polr-ytube-list
                    .hass=${this.hass}
                    .entity=${this.entity}
                    @navigate=${(ev) => this._browse(ev.detail.action)}
                    .grid=${this.coverNavigation}
                    columns=${this.coverNavigation ? "3" : "1"}
                ></polr-ytube-list>
            </div>
        `;
    }

    _renderSearch() {
        return html`
            <div class="search">
                <polr-textfield
                    type="search"
                    id="query"
                    icon
                    @keyup="${this._handleSearchInput}"
                >
                    <ha-icon slot="icon" icon="mdi:magnify"></ha-icon>
                </polr-textfield>

                <polr-select
                    id="filter"
                    fixedMenuPosition
                    naturalMenuWidth
                    @selected=${this._search}
                >
                    <mwc-list-item value="all"> All </mwc-list-item>
                    <mwc-list-item value="artists"> Artists </mwc-list-item>
                    <mwc-list-item selected value="songs">
                        Songs
                    </mwc-list-item>
                    <mwc-list-item selected value="playlists">
                        Playlists
                    </mwc-list-item>
                </polr-select>
            </div>
        `;
    }

    public loadElement(element: PoLRYTubeItem) {
        this._browseHistory = [];
        this._browse(element);
    }

    async _browse(element: PoLRYTubeItem) {
        this._polrYTubeList.state = PoLRYTubeListState.LOADING;
        this._browseHistory.push(element);

        if (element.children?.length > 0) {
            this._polrYTubeList.elements = element["children"];
            this._polrYTubeList.state = PoLRYTubeListState.HAS_RESULTS;
        } else {
            try {
                const response = await this.hass.callWS({
                    type: "media_player/browse_media",
                    entity_id: this.entity["entity_id"],
                    media_content_type: element.media_content_type,
                    media_content_id: element.media_content_id,
                });

                this._polrYTubeList.elements = response["children"];
                this._polrYTubeList.state = PoLRYTubeListState.HAS_RESULTS;
            } catch (e) {
                this._polrYTubeList.state = PoLRYTubeListState.ERROR;
                console.error(
                    e,
                    element.media_content_type,
                    element.media_content_id
                );
            }
        }
        this.requestUpdate();
    }

    async _fetchSearchResults() {
        this._polrYTubeList.state = PoLRYTubeListState.LOADING;

        try {
            let response = await this.hass.callWS({
                type: "media_player/browse_media",
                entity_id: this.entity?.entity_id,
                media_content_type: "search",
                media_content_id: "",
            });

            if (response["children"]?.length > 0) {
                // TODO: Move to ytube_music_player component,
                //       instead of handling in frontend
                // Filter out community playlists of podcast
                response["children"].filter(
                    (el) => !el["media_content_id"].startsWith("MPSP")
                );

                if (!this._isSearchResults)
                    this._previousBrowseHistory = this._browseHistory;

                this._isSearchResults = true;
                this._browseHistory = [];
                this._browse(response);

                this.requestUpdate();
            } else this._polrYTubeList.state = PoLRYTubeListState.NO_RESULTS;
        } catch (e) {
            this._polrYTubeList.state = PoLRYTubeListState.ERROR;
            console.error(e);
        }
    }

    private _renderNavigation() {
        if (this._browseHistory.length <= 1 && !this._isSearchResults)
            return html``;

        let breadcrumbItems;
        if (this._browseHistory.length > 2) {
            breadcrumbItems = [
                this._browseHistory[0].title,
                "...",
                this._browseHistory[this._browseHistory.length - 1].title,
            ];
        } else {
            breadcrumbItems = this._browseHistory.map((item) => item.title);
        }

        let breadcrumb = html`
            ${join(
                map(
                    breadcrumbItems,
                    (i) => html`<span class="crumb">${i}</span>`
                ),
                html`<span class="separator">/</span>`
            )}
        `;

        return html`
            <div class="navigation-row">
                ${this._isSearchResults
                    ? html`
                          <mwc-icon-button
                              @click=${() => {
                                  this._isSearchResults = false;
                                  this._browseHistory =
                                      this._previousBrowseHistory;
                                  this._searchTextField.value = "";
                                  this._browse(this._browseHistory.pop());
                              }}
                          >
                              ${CloseIcon}
                          </mwc-icon-button>
                      `
                    : nothing}
                ${this._browseHistory.length > 1
                    ? html`
                          <mwc-icon-button
                              @click=${() =>
                                  this._browse(
                                      this._browseHistory.pop() &&
                                          this._browseHistory.pop()
                                  )}
                          >
                              ${ArrowLeftIcon}
                          </mwc-icon-button>
                      `
                    : nothing}
                ${this._browseHistory.length > 1 || this._isSearchResults
                    ? html` <div class="breadcrumb">${breadcrumb}</div> `
                    : nothing}
            </div>
        `;
    }

    private _renderPlay() {
        const element = this._browseHistory[this._browseHistory.length - 1];

        if (element?.can_play) {
            return html`
                <div class="playable_result">
                    ${element.title}
                    <mwc-button
                        raised
                        dense
                        @click=${() =>
                            this.hass.callService(
                                "media_player",
                                "play_media",
                                {
                                    entity_id: this.entity["entity_id"],
                                    media_content_id: element.media_content_id,
                                    media_content_type:
                                        element.media_content_type,
                                }
                            )}
                    >
                        Play
                    </mwc-button>
                </div>
            `;
        }
    }

    private _handleSearchInput(ev) {
        if (ev.keyCode == 13) {
            this._search();
            this._searchTextField.blur();
        }
    }

    async _search() {
        const query = (this.shadowRoot.querySelector("#query") as any)?.value;
        const filter = (this.renderRoot.querySelector("#filter") as any)
            ?.selected.value;

        if (query == "") return;

        let data;
        if (filter == "all") {
            data = {
                entity_id: this.entity?.entity_id,
                query: query,
                limit: 40,
            };
        } else {
            data = {
                entity_id: this.entity?.entity_id,
                query: query,
                filter: filter,
                limit: 40,
            };
        }

        await this.hass.callService("ytube_music_player", "search", data);
        this._fetchSearchResults();
    }

    static get styles(): CSSResultGroup {
        return [
            css`
                .container {
                    display: flex;
                    overflow: auto;
                    flex-grow: 1;
                    flex-direction: column;
                    gap: 8px;
                }

                .navigation-row {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    justify-content: flex-start;
                    --mdc-icon-button-size: 30px;
                    --mdc-icon-size: 20px;
                }

                .breadcrumb {
                    display: flex;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    align-items: center;
                    margin-left: 4px;
                }

                .crumb {
                    background-color: rgba(111, 111, 111, 0.2);
                    padding: 4px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    font-size: 10px;
                    font-weight: bold;
                }

                .separator {
                    font-weight: bold;
                    padding: 4px;
                }

                .search {
                    display: grid;
                    grid-template-columns: 1fr 120px;
                    align-items: center;
                    gap: 4px;
                }

                .playable_result {
                    display: inline-flex;
                    justify-content: space-between;
                    align-items: center;
                }

                polr-ytube-list {
                    overflow: auto;
                }

                #filter {
                    --select-height: 42px;
                    width: 100%;
                }

                #query {
                    --textfield-height: 42px;
                }
            `,
        ];
    }
}
