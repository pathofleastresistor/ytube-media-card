import {
    LitElement,
    html,
    css,
    CSSResultGroup,
    PropertyValueMap,
    nothing,
} from "lit";
import { property, state, query } from "lit/decorators.js";
import "../shared/polr-tab";
import "../shared/polr-tab-bar";
import "../elements/polr-media-control";
import "../elements/polr-ytube-playing";
import "../elements/polr-ytube-browser";
import { areDeeplyEqual, PoLRYTubeItem, PoLRYTubeTab } from "../utils/utils";
import { CastAudioIcon } from "../utils/icons";

export class PoLRYTubePlayingCard extends LitElement {
    @state() _config: any = {};
    _hass: any;
    @state() _entity: any;
    @state() _activeTab: PoLRYTubeTab = PoLRYTubeTab.CURRENTLY_PLAYING;
    @state() _sourceSelectorButton: any;
    @query("#sourceSelectorMenu") _sourceSelectorMenu: any;
    @query("#playing") _playing: any;

    protected firstUpdated(
        _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
    ): void {
        this._sourceSelectorButton = this.renderRoot.querySelector(
            "#sourceSelectorButton"
        );
    }

    static getConfigElement() {}

    static getStubConfig() {
        return {
            entity_id: "media_player.ytube_music_player",
            header: "YouTube Music",
        };
    }

    setConfig(config: any) {
        if (!config.entity_id) {
            throw new Error("entity_id must be specified");
        }

        this._config = structuredClone(config);
        if (!("header" in this._config)) this._config.header = "YouTube Music";
        if (!("icon" in this._config)) this._config.searchTitle = "mdi:speaker";
        if (!("initialAction" in this._config)) {
            this._config.initialAction = new PoLRYTubeItem();
            this._config.initialAction.title = "You";
            this._config.initialAction.media_content_type = nothing;
            this._config.initialAction.media_content_id = nothing;
        }
        if (!("coverNavigation" in this._config)) {
            this._config.coverNavigation = false;
        }
    }

    set hass(hass) {
        this._hass = hass;
        const newEntity = this._hass["states"][this._config["entity_id"]];

        if (!areDeeplyEqual(this._entity, newEntity, [])) {
            if (this._entity?.state == "off" && newEntity.state != "off")
                this._changeTab(PoLRYTubeTab.CURRENTLY_PLAYING);

            this._entity = structuredClone(newEntity);

            if (this._entity.state == "off")
                this._changeTab(PoLRYTubeTab.FOR_YOU);

            this._playing?.refresh();
        }
    }

    render() {
        return html`
            <ha-card>
                ${this._renderBackground()}
                <div class="header">
                    <div class="icon-container" @click=${this._togglePower}>
                        ${this._renderIcon()}
                    </div>
                    <div class="info-container">
                        ${this._renderPrimary()} ${this._renderSecondary()}
                    </div>
                    <div class="action-container">
                        ${this._renderSourceSelctor()}
                    </div>
                </div>
                <div class="content">
                    ${this._entity?.state != "off"
                        ? html`
                              <polr-media-control
                                  id="mediaControl"
                                  .hass=${this._hass}
                                  .entity=${this._entity}
                              >
                              </polr-media-control>
                              <polr-tab-bar
                                  activeIndex=${this._activeTab}
                                  @MDCTabBar:activated="${(ev) =>
                                      this._changeTab(ev.detail.index)}"
                              >
                                  <polr-tab label="Playing"></polr-tab>
                                  <polr-tab label="For You"></polr-tab>
                              </polr-tab-bar>
                          `
                        : nothing}
                    ${this._renderTab()}
                </div>
            </ha-card>
        `;
    }

    _renderBackground() {
        let img_url;

        if (this._entity?.attributes?.entity_picture_local)
            img_url = this._entity.attributes.entity_picture_local;

        if (this._entity?.attributes?.entity_picture)
            img_url = this._entity.attributes.entity_picture_local;

        return html`
            <div
                class="background"
                style="
                background: linear-gradient(
                    to top, var(--polr-ytube-bg-color) 30%, 
                    rgba(var(--rgb-card-background-color),0.1) 50%), 
                    url('${img_url}')
                    no-repeat;
                background-size: contain;
                transition: background 2s ease-in-out;
                filter: brightness(var(--polr-ytube-bg-brightness))"
            ></div>
        `;
    }

    _renderIcon() {
        if (this._entity?.attributes?.entity_picture_local)
            return html`<img
                src="${this._entity.attributes.entity_picture_local}"
            /> `;

        if (this._entity?.attributes?.entity_picture)
            return html`<img
                src="${this._entity.attributes.entity_picture}"
            /> `;

        if (this._entity?.state == "off")
            return html`<ha-icon icon="mdi:speaker"></ha-icon> `;

        return html`<ha-icon icon="${this._config.icon}"></ha-icon> `;
    }

    _renderPrimary() {
        if (this._entity?.attributes?.media_title)
            return html`<div class="primary">
                ${this._entity.attributes.media_title}
            </div>`;

        return html` <div class="primary">${this._config.header}</div> `;
    }

    _renderSecondary() {
        if (this._entity?.attributes?.media_artist)
            return html`
                <div class="secondary">
                    ${this._entity.attributes.media_artist}
                </div>
            `;

        return html``;
    }

    _renderSourceSelctor() {
        let media_players = [];

        for (const [key, value] of Object.entries(this._hass["states"])) {
            if (key.startsWith("media_player")) {
                // Skip ytube_media_player entities
                if ((value as any)?.attributes?.remote_player_id) continue;

                if (
                    "speakers" in this._config &&
                    !this._config.speakers.includes(key)
                ) {
                    continue;
                }

                media_players.push([key, value["attributes"]["friendly_name"]]);
            }
        }

        media_players.sort(function (a, b) {
            if (a[1] < b[1]) return -1;
            if (a[1] > b[1]) return 1;
            return 0;
        });

        return html`
            <div class="source" style="position: relative;">
                <mwc-icon-button
                    id="sourceSelectorButton"
                    @click=${() => this._sourceSelectorMenu.show()}
                >
                    ${CastAudioIcon}
                </mwc-icon-button>
                <mwc-menu
                    id="sourceSelectorMenu"
                    @selected=${this._selectSource}
                    .anchor=${this._sourceSelectorButton}
                    corner="BOTTOM_END"
                    menuCorner="END"
                    naturalmenuwidth
                    fixed
                >
                    ${media_players.map((item) =>
                        item[0] == this._entity?.attributes?.remote_player_id
                            ? html`<mwc-list-item
                                  selected
                                  activated
                                  value=${item[0]}
                              >
                                  ${item[1]}
                              </mwc-list-item> `
                            : html`<mwc-list-item value=${item[0]}
                                  >${item[1]}</mwc-list-item
                              > `
                    )}
                </mwc-menu>
            </div>
        `;
    }

    _renderTab() {
        return html`
            <polr-ytube-playing
                class="${this._activeTab == PoLRYTubeTab.CURRENTLY_PLAYING
                    ? "activeTab"
                    : "hiddenTab"}"
                id="playing"
                ._hass=${this._hass}
                ._entity=${this._entity}
            ></polr-ytube-playing>
            <polr-ytube-browser
                class="${this._activeTab == PoLRYTubeTab.FOR_YOU
                    ? "activeTab"
                    : "hiddenTab"}"
                .hass=${this._hass}
                .entity=${this._entity}
                .initialAction=${this._config.initialAction}
                .coverNavigation=${this._config.coverNavigation}
            ></polr-ytube-browser>
        `;
    }

    async _changeTab(index: any) {
        switch (index) {
            case 0:
                this._activeTab = PoLRYTubeTab.CURRENTLY_PLAYING;
                //this._getCurrentlyPlayingItems();
                break;
            case 1:
                this._activeTab = PoLRYTubeTab.FOR_YOU;
                break;
            default:
                break;
        }
    }

    async _selectSource() {
        const selectedSource = this._sourceSelectorMenu.selected.value;
        const currentSource = this._entity?.attributes?.remote_player_id;

        if (selectedSource == "" || selectedSource == currentSource) return;

        this._hass.callService("media_player", "select_source", {
            entity_id: this._config.entity_id,
            source: selectedSource,
        });
    }

    async _togglePower() {
        await this._hass.callService("media_player", "turn_off", {
            entity_id: this._config.entity_id,
        });

        this.requestUpdate();
    }

    static get styles(): CSSResultGroup {
        return [
            css`
                :host {
                    --polr-ytube-bg-brightness: 25%;
                    --polr-ytube-bg-color: #1c1c1c;
                    --polr-ytube-text-color: #ffffff;
                    --primary-text-color: var(--polr-ytube-text-color);
                    --mdc-theme-text-primary-on-background: var(
                        --polr-ytube-text-color
                    );
                    --mdc-tab-text-label-color-default: var(
                        --polr-ytube-text-color
                    );
                    --mdc-text-field-fill-color: var(--polr-ytube-bg-color);
                    --mdc-select-fill-color: var(--polr-ytube-bg-color);
                    --mdc-select-ink-color: var(--polr-ytube-text-color);
                    --mdc-select-focused-dropdown-icon-color: #ffffffff;
                    --mdc-select-dropdown-icon-color: var(
                        --polr-ytube-text-color
                    );
                    --mdc-theme-surface: var(--polr-ytube-bg-color);
                    --mdc-text-field-ink-color: var(--polr-ytube-text-color);
                    --mdc-theme-primary: var(--primary-color);
                    --icon-primary-color: var(--polr-ytube-text-color);
                }

                ha-card {
                    height: 700px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    transition: filter 0.8s ease 0s;
                }

                .header {
                    position: relative;
                    display: grid;
                    grid-template-columns: 40px auto min-content;
                    padding: 12px 12px 0 12px;
                    gap: 12px;
                    align-items: center;
                }

                .icon-container {
                    display: flex;
                    height: 40px;
                    width: 40px;
                    border-radius: 50%;
                    background: rgba(111, 111, 111, 0.2);
                    place-content: center;
                    align-items: center;
                }

                .icon-container > img {
                    width: 40px;
                    height: 40px;
                    border-radius: 5%;
                    cursor: pointer;
                }

                .info-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .primary {
                    font-weight: bold;
                }

                .secondary {
                    font-size: 12px;
                }

                .action-container {
                    display: flex;
                    justify-content: flex-end;
                }

                .content {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    overflow: auto;
                    gap: 12px;
                    padding: 12px;
                }

                .hiddenTab {
                    display: none;
                }

                #playing {
                    overflow: auto;
                }

                polr-ytube-browser {
                    display: flex;
                    flex-grow: 1;
                    overflow: auto;
                }
            `,
        ];
    }
}
customElements.define("polr-ytube-playing-card", PoLRYTubePlayingCard);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: "polr-ytube-playing-card",
    name: "PoLR YouTube Playing",
    description: "Requires the ytube_media_player integration",
});
