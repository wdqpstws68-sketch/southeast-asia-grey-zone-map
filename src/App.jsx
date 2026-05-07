import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  Popup,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import regions from "./data/regions.json";
import events from "./data/events.json";
import flows from "./data/flows.json";
import geopolitical from "./data/geopolitical.json";
import globalFlowData from "./data/globalFlows.json";
import analysisOverlays from "./data/analysisOverlays.json";
import regionalHighlightAreas from "./data/regionalHighlightAreas.json";
import naturalEarthCountries from "./data/naturalEarthCountries.json";
import naturalEarthCorridorLines from "./data/naturalEarthCorridorLines.json";
import naturalEarthMaritimeBoundaries from "./data/naturalEarthMaritimeBoundaries.json";

const GEOPOLITICAL_COUNTRIES = geopolitical.countries;
const GEOPOLITICAL_BORDERS = geopolitical.borders;
const GLOBAL_FLOWS = globalFlowData.global_flows;
const ENDPOINT_COUNTRIES = globalFlowData.endpoint_countries;
const ANALYSIS_NODES = analysisOverlays.nodes;
const ANALYSIS_CORRIDORS = analysisOverlays.corridors;
const ANALYSIS_FRAMEWORKS = analysisOverlays.frameworks;
const REGIONAL_HIGHLIGHT_AREAS = regionalHighlightAreas;
const NATURAL_EARTH_COUNTRIES = naturalEarthCountries;
const NATURAL_EARTH_CORRIDOR_LINES = naturalEarthCorridorLines;
const NATURAL_EARTH_MARITIME_BOUNDARIES = naturalEarthMaritimeBoundaries;

const MAP_DESIGN_ASSET_BASE = "/assets/map-design";
const VISUAL_ASSETS = {
  ambientOverlay: `${MAP_DESIGN_ASSET_BASE}/map-ambient-overlay.png`,
  borderRisk: `${MAP_DESIGN_ASSET_BASE}/symbol-border-risk.png`,
  casinoSez: `${MAP_DESIGN_ASSET_BASE}/symbol-casino-sez.png`,
  enforcement: `${MAP_DESIGN_ASSET_BASE}/symbol-enforcement.png`,
  finance: `${MAP_DESIGN_ASSET_BASE}/symbol-finance.png`,
  humanFlow: `${MAP_DESIGN_ASSET_BASE}/symbol-human-flow.png`,
  infrastructure: `${MAP_DESIGN_ASSET_BASE}/symbol-infrastructure.png`,
  maritime: `${MAP_DESIGN_ASSET_BASE}/symbol-maritime.png`,
  reportedCompound: `${MAP_DESIGN_ASSET_BASE}/symbol-reported-compound.png`,
};

const CONTEXT_COUNTRY_COLOR = "#64706b";
const SOUTH_ASIA_CONTEXT_COUNTRY_IDS = ["india", "pakistan", "bangladesh", "nepal", "sri-lanka"];
const CONTEXT_COUNTRIES = [
  { id: "china", name_ja: "中国", name_en: "China" },
  { id: "usa", name_ja: "アメリカ合衆国", name_en: "United States" },
  { id: "japan", name_ja: "日本", name_en: "Japan" },
  { id: "uk", name_ja: "イギリス", name_en: "United Kingdom" },
  { id: "india", name_ja: "インド", name_en: "India" },
  { id: "pakistan", name_ja: "パキスタン", name_en: "Pakistan" },
  { id: "bangladesh", name_ja: "バングラデシュ", name_en: "Bangladesh" },
  { id: "nepal", name_ja: "ネパール", name_en: "Nepal" },
  { id: "sri-lanka", name_ja: "スリランカ", name_en: "Sri Lanka" },
  { id: "australia", name_ja: "オーストラリア", name_en: "Australia" },
].map((country) => ({
  ...country,
  color: CONTEXT_COUNTRY_COLOR,
}));
const CONTEXT_COUNTRY_MAP = new Map(CONTEXT_COUNTRIES.map((country) => [country.id, country]));

const LAYER_CONFIG = {
  border_risk: {
    label: "国境地帯リスク帯",
    shortLabel: "国境",
    icon: "BR",
    color: "#8a5b2f",
    fill: "#c99155",
    radius: 52000,
  },
  reported_compound: {
    label: "報告された詐欺拠点地域",
    shortLabel: "詐欺",
    icon: "!",
    color: "#a43c48",
    fill: "#d96a6a",
  },
  casino_sez: {
    label: "カジノ/SEZ関連地域",
    shortLabel: "SEZ",
    icon: "S",
    color: "#5c678f",
    fill: "#8794c4",
  },
  maritime_connection: {
    label: "海洋部接続圏",
    shortLabel: "海洋",
    icon: "M",
    color: "#2b6f9a",
    fill: "#66a6c8",
  },
  casino_online_gambling: {
    label: "オンライン賭博/POGO関連",
    shortLabel: "賭博",
    icon: "P",
    color: "#8f4a68",
    fill: "#c56e93",
  },
  financial_node: {
    label: "金融/法人接続",
    shortLabel: "金融",
    icon: "F",
    color: "#8a7440",
    fill: "#c5ad66",
  },
  policy_enforcement: {
    label: "政策/執行対応",
    shortLabel: "政策",
    icon: "E",
    color: "#486c58",
    fill: "#75a283",
  },
  trafficking_route: {
    label: "人身取引・移動ルート",
    shortLabel: "移動",
    icon: "R",
    color: "#2f7476",
  },
  china_upstream: {
    label: "中国側出口・押し出し地点",
    shortLabel: "中国",
    icon: "中",
    color: "#14191b",
    fill: "#14191b",
  },
  victim_supply: {
    label: "労働力供給・被害起点",
    shortLabel: "供給",
    icon: "O",
    color: "#7a5a8e",
    fill: "#cdb7dc",
  },
  physical_infrastructure: {
    label: "鉄道・水系・物理インフラ",
    shortLabel: "物理",
    icon: "I",
    color: "#2b6f9a",
    fill: "#a9d6e7",
  },
  financial_trace: {
    label: "金融・暗号資産経路",
    shortLabel: "資金",
    icon: "$",
    color: "#8a7440",
    fill: "#e7d48a",
  },
  infrastructure_dependency: {
    label: "電力・通信・補給依存",
    shortLabel: "補給",
    icon: "電",
    color: "#b36a2e",
    fill: "#f0bf7c",
  },
  entity_detail: {
    label: "固有名・施設・クラン関連点",
    shortLabel: "固有",
    icon: "N",
    color: "#5c678f",
    fill: "#aeb8df",
  },
  governance_method: {
    label: "方法論・凡例・制度起点",
    shortLabel: "方法",
    icon: "M",
    color: "#486c58",
    fill: "#9ec4a7",
  },
  timeline_events: {
    label: "取り締まり/報告の時系列",
    shortLabel: "時系列",
    icon: "T",
    color: "#527348",
    fill: "#7da86c",
  },
};

const LAYER_MARKER_GLYPHS = {
  border_risk: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5 18.5 6v5.1c0 4.6-2.5 7.6-6.5 9.4-4-1.8-6.5-4.8-6.5-9.4V6L12 3.5Z" />
      <path d="M8.2 11.2h7.6M12 7.6v7.8" />
    </svg>
  `,
  reported_compound: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.2 19.2h11.6l1.1-4.8c.8-3.6-1.9-7-5.6-7h-2.6c-3.7 0-6.4 3.4-5.6 7l1.1 4.8Z" />
      <path d="M8.4 19.2v-2.7h7.2v2.7M12 10.2v4.1M12 16.6h.1M6.6 5.2 4.4 3M17.4 5.2 19.6 3" />
    </svg>
  `,
  casino_sez: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 20h15M6 9.2 12 5l6 4.2H6Z" />
      <path d="M7.2 10.2v7M10.4 10.2v7M13.6 10.2v7M16.8 10.2v7" />
    </svg>
  `,
  maritime_connection: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4.2v14.2" />
      <path d="M8.6 7.3a3.4 3.4 0 1 1 6.8 0 3.4 3.4 0 0 1-6.8 0Z" />
      <path d="M5 15.5c2.2 2.1 4.3 3.1 7 3.1s4.8-1 7-3.1" />
      <path d="M7.2 20.1c1.6.7 3.2 1 4.8 1s3.2-.3 4.8-1" />
    </svg>
  `,
  casino_online_gambling: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="3" />
      <path d="M9.2 9.2h.1M14.8 9.2h.1M12 12h.1M9.2 14.8h.1M14.8 14.8h.1" />
    </svg>
  `,
  financial_node: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 18.5h15M6 10.2 12 6l6 4.2H6Z" />
      <path d="M8 11.5v4.5M12 11.5v4.5M16 11.5v4.5" />
      <path d="M12 3.5v2.3" />
    </svg>
  `,
  policy_enforcement: `
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.7 18.2 6v5.4c0 4.2-2.4 7.2-6.2 8.9-3.8-1.7-6.2-4.7-6.2-8.9V6L12 3.7Z" />
      <path d="m8.8 12.2 2.1 2.1 4.4-4.7" />
    </svg>
  `,
};

const REGION_THEME_LAYERS = [
  "border_risk",
  "reported_compound",
  "casino_sez",
  "maritime_connection",
  "casino_online_gambling",
  "financial_node",
  "policy_enforcement",
];

const MAP_MODES = [
  {
    id: "distribution",
    label: "分布",
    description: "地域ごとのテーマアイコンを中心に読む",
  },
  {
    id: "connections",
    label: "接続",
    description: "起点と終点の関係を示す線を中心に読む",
  },
  {
    id: "comparison",
    label: "比較",
    description: "ポイント分布と接続線を重ねて読む",
  },
  {
    id: "geography",
    label: "国境",
    description: "国別アウトラインと国境回廊を中心に読む",
  },
  {
    id: "global",
    label: "世界",
    description: "東南アジアから世界各地への接続線を読む",
  },
];

const FLOW_TYPE_CONFIG = {
  recruitment_route: {
    label: "求人・移動",
    color: "#2f7476",
    fill: "#d9efec",
    description:
      "偽求人、仲介者、空港・国境通過を通じて、人が詐欺拠点側へ連れて行かれたと報告される方向を示します。",
  },
  casino_sez_connection: {
    label: "カジノ/SEZ接続",
    color: "#5c678f",
    fill: "#e3e7f4",
    description:
      "カジノ、SEZ、不動産、ホテル、オンライン賭博の運営基盤が、複数の国境都市圏でつながる関係を示します。",
  },
  network_shift: {
    label: "拠点/ネットワーク移動",
    color: "#7a5a8e",
    fill: "#eee6f3",
    description:
      "摘発、紛争、国境管理の強化を受け、拠点や運営ノウハウが別地域へ移ったとされる傾向を示します。",
  },
  trafficking: {
    label: "人身移送",
    color: "#2f7476",
    fill: "#d9efec",
    description:
      "被害者が欺かれ、旅券没収や債務拘束を伴って拠点へ移送された報告を、人の流れとして示します。",
  },
  displacement: {
    label: "移転/再配置",
    color: "#7a5a8e",
    fill: "#eee6f3",
    description:
      "施設そのものの引っ越しではなく、摘発圧力後に運営・人員・資本が再配置される傾向を示します。",
  },
  finance: {
    label: "金融接続",
    color: "#8a7440",
    fill: "#f1e8c8",
    description:
      "詐欺収益、口座、法人、資産、送金経路が別の金融圏へ接続する関係を示します。",
  },
  enforcement: {
    label: "制裁/摘発接続",
    color: "#486c58",
    fill: "#dcebdd",
    description:
      "制裁、共同摘発、送還、警察協力などの法執行がどの地域・国へ作用したかを示します。人や資金が移動する意味ではありません。",
  },
  upstream_supply: {
    label: "上流供給",
    color: "#14191b",
    fill: "#e3e5e2",
    description:
      "国内の雇用不安、偽求人、越境志願、送還先など、詐欺労働へ接続する上流側の圧力を示します。",
  },
  victim_supply: {
    label: "労働力起点",
    color: "#7a5a8e",
    fill: "#eee6f3",
    description:
      "被害者の国籍・出身地域を束ね、どこから人が誘引されやすいかを概略で示します。",
  },
  physical_infrastructure: {
    label: "物理インフラ",
    color: "#2b6f9a",
    fill: "#d8eaf4",
    description:
      "鉄道、水系、道路、港湾など、合法物流と違法な移動が重なりうる物理的な通路を示します。",
  },
  financial_trace: {
    label: "金融/暗号資産",
    color: "#8a7440",
    fill: "#f1e8c8",
    description:
      "暗号資産、地下銀行、OTC、シェル法人など、収益を動かす典型的な金融レールを示します。",
  },
  infrastructure_dependency: {
    label: "補給依存",
    color: "#b36a2e",
    fill: "#f3e1cc",
    description:
      "電力、通信、燃料、衛星通信など、国境拠点を稼働させる外部補給への依存を示します。",
  },
  governance_method: {
    label: "制度/方法論",
    color: "#486c58",
    fill: "#dcebdd",
    description:
      "制度変化、分析枠組み、統治の空白など、個別事件の背後にある読み方を示します。",
  },
};

const GLOBAL_FLOW_CONFIG = {
  victim_recruitment: {
    label: "求人誘引",
    icon: "人",
    color: "#8f4a68",
    fill: "#f4dbe6",
    description:
      "偽の高収入求人や仲介を通じて、国外の人が詐欺拠点へ誘引される関係です。",
  },
  trafficking_route: {
    label: "人の移動",
    icon: "人",
    color: "#2f7476",
    fill: "#d9efec",
    description:
      "被害者が国境や空港を経由して移送される報告を、国・地域単位で束ねた線です。",
  },
  fraud_targeting: {
    label: "被害市場",
    icon: "標",
    color: "#a43c48",
    fill: "#f1d7da",
    description:
      "東南アジア側の拠点から、国外の個人・市場へオンライン詐欺が向けられる関係です。",
  },
  money_laundering: {
    label: "資金流",
    icon: "$",
    color: "#8a7440",
    fill: "#f1e8c8",
    description:
      "詐欺収益が金融サービス、地下銀行、国際金融システムへ流れ込む関係です。",
  },
  crypto_flow: {
    label: "暗号資産",
    icon: "₿",
    color: "#5c678f",
    fill: "#e3e7f4",
    description:
      "暗号資産、偽投資サイト、OTC、ウォレットなどを通じた資金移動の関係です。",
  },
  casino_sez_network: {
    label: "カジノ/SEZ",
    icon: "網",
    color: "#7a5a8e",
    fill: "#eee6f3",
    description:
      "カジノ、SEZ、ホテル、不動産開発が、詐欺拠点やオンライン賭博の器になる関係です。",
  },
  enforcement_sanctions: {
    label: "制裁/摘発",
    icon: "E",
    color: "#486c58",
    fill: "#dcebdd",
    description:
      "制裁、資産凍結、取引禁止、共同捜査など、国や当局による法執行の作用方向です。",
  },
  repatriation: {
    label: "救出/送還",
    icon: "帰",
    color: "#2b6f9a",
    fill: "#d8eaf4",
    description:
      "救出された被害者が国境や第三国を経由して母国へ戻る対応を示します。",
  },
  network_relocation: {
    label: "拠点移転",
    icon: "拠",
    color: "#b36a2e",
    fill: "#f3e1cc",
    description:
      "摘発や紛争で詐欺ネットワークが別の国・国境圏へ分散する傾向を示します。",
  },
  upstream_supply: {
    label: "上流供給",
    icon: "人",
    color: "#14191b",
    fill: "#e3e5e2",
    description:
      "被害者・労働者・運営人材の供給圧を、出身地域や出口地点から読むための線です。",
  },
  physical_infrastructure: {
    label: "物理インフラ",
    icon: "I",
    color: "#2b6f9a",
    fill: "#d8eaf4",
    description:
      "鉄道、道路、水系など、合法移動と犯罪的移動が同じ通路に重なる可能性を示します。",
  },
  infrastructure_dependency: {
    label: "補給依存",
    icon: "補",
    color: "#b36a2e",
    fill: "#f3e1cc",
    description:
      "電力、通信、燃料、衛星通信など、拠点の稼働条件を支える外部補給の関係です。",
  },
  financial_trace: {
    label: "金融/暗号資産",
    icon: "$",
    color: "#8a7440",
    fill: "#f1e8c8",
    description:
      "暗号資産、地下銀行、オフショア法人、金融管轄を通じる資金経路の束です。",
  },
};

const LAYER_VISUALS = {
  border_risk: VISUAL_ASSETS.borderRisk,
  reported_compound: VISUAL_ASSETS.reportedCompound,
  casino_sez: VISUAL_ASSETS.casinoSez,
  maritime_connection: VISUAL_ASSETS.maritime,
  casino_online_gambling: VISUAL_ASSETS.casinoSez,
  financial_node: VISUAL_ASSETS.finance,
  policy_enforcement: VISUAL_ASSETS.enforcement,
  trafficking_route: VISUAL_ASSETS.humanFlow,
  china_upstream: VISUAL_ASSETS.humanFlow,
  victim_supply: VISUAL_ASSETS.humanFlow,
  physical_infrastructure: VISUAL_ASSETS.infrastructure,
  financial_trace: VISUAL_ASSETS.finance,
  infrastructure_dependency: VISUAL_ASSETS.infrastructure,
  entity_detail: VISUAL_ASSETS.reportedCompound,
  governance_method: VISUAL_ASSETS.enforcement,
  timeline_events: VISUAL_ASSETS.enforcement,
};

const GLOBAL_FLOW_VISUALS = {
  victim_recruitment: VISUAL_ASSETS.humanFlow,
  trafficking_route: VISUAL_ASSETS.humanFlow,
  fraud_targeting: VISUAL_ASSETS.reportedCompound,
  money_laundering: VISUAL_ASSETS.finance,
  crypto_flow: VISUAL_ASSETS.finance,
  casino_sez_network: VISUAL_ASSETS.casinoSez,
  enforcement_sanctions: VISUAL_ASSETS.enforcement,
  repatriation: VISUAL_ASSETS.humanFlow,
  network_relocation: VISUAL_ASSETS.casinoSez,
  upstream_supply: VISUAL_ASSETS.humanFlow,
  physical_infrastructure: VISUAL_ASSETS.infrastructure,
  infrastructure_dependency: VISUAL_ASSETS.infrastructure,
  financial_trace: VISUAL_ASSETS.finance,
};

const MOTION_VISUALS = {
  people: VISUAL_ASSETS.humanFlow,
  money: VISUAL_ASSETS.finance,
  substance: VISUAL_ASSETS.reportedCompound,
  network: VISUAL_ASSETS.casinoSez,
  enforcement: VISUAL_ASSETS.enforcement,
  infrastructure: VISUAL_ASSETS.infrastructure,
};

const STORY_VISUALS = {
  structure: VISUAL_ASSETS.humanFlow,
  movement: VISUAL_ASSETS.infrastructure,
  finance: VISUAL_ASSETS.casinoSez,
  enforcement: VISUAL_ASSETS.enforcement,
};

const MOTION_MODES = [
  {
    id: "always",
    label: "常時",
    description: "表示中の経路を常に流す",
  },
  {
    id: "selected",
    label: "選択時",
    description: "選択した経路だけ手動で流す",
  },
];

const MOTION_KIND_CONFIG = {
  people: {
    label: "人",
    description: "求人誘引、強制移送、救出・送還など、人の移動や滞留を示すアイコンです。",
    className: "people",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="6.7" r="3" />
        <path d="M7.2 20.4c.4-4.2 2-6.3 4.8-6.3s4.4 2.1 4.8 6.3" />
        <path d="M8.5 11.9h7" />
      </svg>
    `,
  },
  money: {
    label: "資金",
    description: "詐欺収益、暗号資産、口座、地下銀行などの資金経路を示すアイコンです。",
    className: "money",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 8.2h10a2 2 0 0 1 2 2v5.6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5.6a2 2 0 0 1 2-2Z" />
        <path d="M12 9.7v6.6M14.2 11.2c-.5-.5-1.2-.8-2.1-.8-1.1 0-1.9.5-1.9 1.3 0 .9.9 1.2 2 1.4 1.1.2 2 .5 2 1.4 0 .8-.8 1.3-2 1.3-.9 0-1.7-.3-2.3-.9" />
        <path d="M7.2 6.4h9.6" />
      </svg>
    `,
  },
  substance: {
    label: "薬物",
    description: "薬物・密輸など、他の越境犯罪と重なる経路を示すための補助アイコンです。",
    className: "substance",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8.2 15.8 15.8 8.2a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a3.1 3.1 0 0 1-4.4-4.4Z" />
        <path d="m11.9 12.1 3.9 3.9" />
      </svg>
    `,
  },
  network: {
    label: "拠点",
    description: "カジノ、SEZ、詐欺拠点、運営ネットワークの移転・接続を示すアイコンです。",
    className: "network",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.2 17.8h11.6" />
        <path d="M7.5 17.8V9.7L12 6.5l4.5 3.2v8.1" />
        <path d="M10 17.8v-4h4v4" />
        <path d="M8.3 11.2h1.5M14.2 11.2h1.5" />
      </svg>
    `,
  },
  enforcement: {
    label: "制裁/摘発",
    description:
      "制裁、摘発、送還、捜査協力などの法執行が作用する向きを示します。『失効』ではなく『執行』の意味でした。",
    className: "enforcement",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3.8 18.3 6v5.4c0 4.1-2.4 7.2-6.3 8.8-3.9-1.6-6.3-4.7-6.3-8.8V6L12 3.8Z" />
        <path d="m8.8 12.4 2 2 4.5-4.9" />
      </svg>
    `,
  },
  infrastructure: {
    label: "補給",
    description: "電力、通信、燃料、鉄道、水系など、拠点を支えるインフラや補給依存を示します。",
    className: "infrastructure",
    glyph: `
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M13.4 3.8 6.8 13h4.7l-1 7.2 6.7-9.6h-4.5l.7-6.8Z" />
      </svg>
    `,
  },
};

const MOTION_LEGEND_ORDER = [
  "people",
  "money",
  "substance",
  "network",
  "enforcement",
  "infrastructure",
];

const FLOW_TYPE_MOTION_KIND = {
  recruitment_route: "people",
  trafficking: "people",
  trafficking_route: "people",
  victim_recruitment: "people",
  victim_supply: "people",
  upstream_supply: "people",
  repatriation: "people",
  finance: "money",
  financial_trace: "money",
  money_laundering: "money",
  crypto_flow: "money",
  financial_node: "money",
  drug_trafficking: "substance",
  narcotics: "substance",
  enforcement: "enforcement",
  enforcement_sanctions: "enforcement",
  policy_enforcement: "enforcement",
  physical_infrastructure: "infrastructure",
  infrastructure_dependency: "infrastructure",
  network_shift: "network",
  network_relocation: "network",
  casino_sez_connection: "network",
  casino_sez_network: "network",
  displacement: "network",
  governance_method: "network",
};

const ENDPOINT_BADGES = {
  region_china_upstream: "CN",
  region_macau_hongkong: "HK",
  country_japan: "JP",
  country_china: "CN",
  country_usa: "US",
  country_uk: "UK",
  country_eu: "EU",
  country_singapore: "SG",
  region_south_asia: "SA",
  region_global: "GL",
};

const DESTINATION_POINT_BADGES = {
  usa: "US",
  uk: "UK",
  eu: "EU",
  china: "CN",
  japan: "JP",
  vietnam: "VN",
  philippines: "PH",
  indonesia: "ID",
  india: "IN",
  south_asia: "SA",
  australia: "AU",
  hong_kong: "HK",
  dubai: "AE",
  uae: "AE",
  cyprus: "CY",
  seychelles: "SC",
  singapore: "SG",
};

const MOTION_SPEED_PIXELS_PER_SECOND = 58;
const MOTION_MIN_DURATION = 5200;
const MOTION_MAX_DURATION = 24000;

const EVIDENCE_META = {
  documented: {
    label: "documented",
    detail: "公的資料または複数資料で確認",
    className: "confidence documented",
  },
  reported: {
    label: "reported",
    detail: "信頼できる報道・資料に基づく報告",
    className: "confidence reported",
  },
  inferred: {
    label: "inferred",
    detail: "直接証拠は限定的だが複数状況から推定",
    className: "confidence inferred",
  },
  under_investigation: {
    label: "under investigation",
    detail: "調査中または流動的",
    className: "confidence investigation",
  },
};

const SOURCE_STATUS_META = {
  public_documented: {
    label: "公開資料あり",
    detail: "公開資料リンクを添えて表示",
    className: "source-status public",
  },
  cc_knowledge: {
    label: "cc-knowledge",
    detail: "既存ノート/講義知識に基づく項目",
    className: "source-status knowledge",
  },
  needs_verification: {
    label: "要出典確認",
    detail: "外部出典での追加確認が必要な候補",
    className: "source-status verification",
  },
  missing_sources: {
    label: "出典未登録",
    detail: "出典リンクが未登録",
    className: "source-status missing",
  },
  user_synthesis: {
    label: "講義メモ統合",
    detail: "提供された講義メモから統合した分析枠組み",
    className: "source-status synthesis",
  },
  cited_lecture: {
    label: "課程資料引用",
    detail: "本授業で扱われた文献／講義で言及された刊行物への直接引用",
    className: "source-status cited-lecture",
  },
};

const SEA_MAP_BOUNDS = [
  [-10.5, 91],
  [29, 128],
];
const GLOBAL_MAP_BOUNDS = [
  [-18, -20],
  [58, 285],
];
const MARITIME_CORRIDOR_IDS = new Set([
  "philippines-malaysia",
  "malaysia-singapore-indonesia",
  "east-timor-indonesia",
]);
const BORDER_SHORT_LABELS = {
  "thai-myanmar": "タイ–ミャンマー",
  "myanmar-yunnan": "ミャンマー–雲南",
  "golden-triangle": "三国境",
  "thai-cambodia": "タイ–カンボジア",
  "cambodia-vietnam": "カンボジア–ベトナム",
  "philippines-malaysia": "比–マレーシア海域",
  "malaysia-singapore-indonesia": "馬・星・尼",
  "east-timor-indonesia": "東ティモール境界",
};
const BORDER_KIND_LABELS = {
  "east-timor-indonesia": "境",
};

const LAYER_INSIGHT_COPY = {
  border_risk:
    "国境管理が届きにくい場所、越境移動、武装勢力や地元権力の影響が重なる地域を示します。",
  reported_compound:
    "オンライン詐欺拠点や強制的な犯罪労働との関連が公開資料で報告された地域です。個別施設ではなく都市圏で示します。",
  casino_sez:
    "カジノ、SEZ、ホテル・不動産開発、オンライン賭博が、詐欺拠点や資金洗浄の受け皿になったと報告される地域です。施設を断定せず、都市圏単位で重なりを示します。",
  maritime_connection:
    "海上移動、空港、送還、政策対応など、大陸部の拠点と島嶼部をつなぐ範囲を示します。",
  casino_online_gambling:
    "POGOやオンライン賭博の施設・制度が、詐欺運営や人身取引と結び付いたと報告された地域です。",
  financial_node:
    "資金洗浄、法人利用、資産押収、金融規制対応が集中する都市圏です。詐欺作業場ではなく、資金の通り道として示します。",
  policy_enforcement:
    "法改正、共同摘発、送還、空港監視など、政策対応や法執行が集中する地域を示します。",
};

const CONFIDENCE_META = {
  documented: {
    label: "documented",
    detail: "複数資料や証言照合で裏付け",
    className: "confidence documented",
  },
  reported: {
    label: "reported",
    detail: "信頼できる公開資料に基づく報告",
    className: "confidence reported",
  },
  under_investigation: {
    label: "under investigation",
    detail: "継続調査または流動的",
    className: "confidence investigation",
  },
};

const DATA_FILTERS = [
  {
    id: "all",
    label: "すべて",
    description: "全項目",
  },
  {
    id: "documented",
    label: "確認済み",
    description: "documented / 公開資料あり",
  },
  {
    id: "reported",
    label: "報告",
    description: "reported",
  },
  {
    id: "needs_review",
    label: "要確認",
    description: "要出典確認 / 推定 / 調査中 / 出典未登録",
  },
];

const STORY_STEPS = [
  {
    id: "structure",
    label: "人",
    kicker: "外部からの人流",
    title: "偽求人で外から連れてこられた人が、詐欺の労働力に変わる",
    summary: "中国、南アジア、アフリカ、島嶼部などから集められた人々が、国境の施設で監禁・暴力・債務拘束を受け、オンライン詐欺を強制される。",
    mapMode: "global",
    targetType: "global",
    targetId: "flow_china_supply_to_mekong",
    motionMode: "selected",
    sources: [
      {
        title: "Hundreds of thousands trafficked into online criminality across SE Asia",
        publisher: "UN Geneva / OHCHR",
        date: "2023-08-29",
        url: "https://www.ungeneva.org/en/news-media/news/2023/08/84386/hundreds-thousands-trafficked-online-criminality-across-se-asia",
      },
      {
        title: "INTERPOL operation reveals further insights into 'globalization' of cyber scam centres",
        publisher: "INTERPOL",
        date: "2023-11-27",
        url: "https://www.interpol.int/en/News-and-Events/News/2023/INTERPOL-operation-reveals-further-insights-into-globalization-of-cyber-scam-centres",
      },
    ],
  },
  {
    id: "movement",
    label: "資源",
    kicker: "外部からの補給",
    title: "電力・通信・燃料が、国境の詐欺拠点を稼働させる",
    summary: "タイ側から供給されるインフラが遮断対象になったことで、詐欺拠点が外部の電力、通信、燃料に依存していたことが政策課題として見える。",
    mapMode: "global",
    targetType: "global",
    targetId: "flow_thai_cutoff_infrastructure_adaptation",
    motionMode: "selected",
    sources: [
      {
        title: "Thailand cuts power supplies to Myanmar border towns in effort to curb scam rings",
        publisher: "Associated Press",
        date: "2025-02-05",
        url: "https://apnews.com/article/0cfdfb57aa2e05e5835b1af3b4ac8e1a",
      },
    ],
  },
  {
    id: "finance",
    label: "器",
    kicker: "カジノ/SEZの転用",
    title: "カジノ、不動産、SEZが詐欺の器に転用される",
    summary: "合法風の建物やライセンスが、監禁・強制労働・暗号資産詐欺の作業場として利用された事例を、カンボジア側の世界接続で読む。",
    mapMode: "global",
    targetType: "global",
    targetId: "flow_kh_sihanouk_global",
    motionMode: "selected",
    sources: [
      {
        title: "Cambodia: Casinos get state approval despite links to human rights abuse at scamming compounds",
        publisher: "Amnesty International",
        date: "2026-04-02",
        url: "https://www.amnesty.org/en/latest/news/2026/04/cambodia-casinos-get-state-approval-despite-links-to-human-rights-abuse-at-scamming-compounds/",
      },
      {
        title: "Transnational Crime in Southeast Asia",
        publisher: "U.S. Institute of Peace",
        date: "2024-05-13",
        url: "https://www.usip.org/publications/2024/05/transnational-crime-southeast-asia-growing-threat-global-peace-and-security",
      },
    ],
  },
  {
    id: "enforcement",
    label: "被害",
    kicker: "世界の被害と法執行",
    title: "詐欺被害は国外へ広がり、制裁・押収・送還で戻ってくる",
    summary: "米英制裁、暗号資産押収、各国送還、国内摘発が同じネットワークを別方向から照らし、東南アジアの拠点と世界の被害市場を結び直す。",
    mapMode: "global",
    targetType: "global",
    targetId: "flow_kh_prince_sanctions",
    motionMode: "selected",
    sources: [
      {
        title: "U.S. and U.K. Take Largest Action Ever Targeting Cybercriminal Networks in Southeast Asia",
        publisher: "U.S. Department of the Treasury",
        date: "2025-10-14",
        url: "https://home.treasury.gov/news/press-releases/sb0278",
      },
      {
        title: "Chairman of Prince Group Indicted for Operating Cambodian Forced Labor Scam Compounds",
        publisher: "U.S. Department of Justice",
        date: "2025-10-14",
        url: "https://www.justice.gov/opa/pr/chairman-prince-group-indicted-operating-cambodian-forced-labor-scam-compounds-engaged",
      },
    ],
  },
];

const ALL_YEARS_LABEL = "すべて";
const INITIAL_MAP_ZOOM = 3.75;
const MARKER_EXPANSION_ZOOM = 5;
const EVENT_MARKER_OFFSETS = [
  [0, 0],
  [0.12, -0.08],
  [-0.12, 0.08],
  [0.1, 0.12],
  [-0.1, -0.12],
  [0.18, 0],
  [0, -0.18],
  [-0.18, 0.02],
];

function normalizeSearchText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map(normalizeSearchText).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value).map(normalizeSearchText).join(" ");
  }

  return String(value).toLocaleLowerCase("ja-JP");
}

function getRecordStatusValues(record) {
  return [record.confidence, record.evidence_level, record.source_status].filter(Boolean);
}

function hasMissingSources(record) {
  return Array.isArray(record.sources) && record.sources.length === 0;
}

function getVerificationIssue(record) {
  if (hasMissingSources(record)) {
    return {
      kind: "source",
      value: "missing_sources",
    };
  }

  if (record.source_status === "needs_verification") {
    return {
      kind: "source",
      value: "needs_verification",
    };
  }

  const evidenceValue = record.evidence_level ?? record.confidence;
  if (evidenceValue === "inferred" || evidenceValue === "under_investigation") {
    return {
      kind: "evidence",
      value: evidenceValue,
    };
  }

  return null;
}

function recordMatchesSearch(record, searchQuery) {
  const query = searchQuery.trim().toLocaleLowerCase("ja-JP");
  if (!query) return true;

  return normalizeSearchText(record).includes(query);
}

function recordMatchesReviewFilter(record, reviewFilter) {
  if (reviewFilter === "all") return true;

  const statuses = getRecordStatusValues(record);
  if (reviewFilter === "documented") {
    return statuses.includes("documented") || statuses.includes("public_documented");
  }
  if (reviewFilter === "reported") {
    return statuses.includes("reported");
  }
  if (reviewFilter === "needs_review") {
    return Boolean(getVerificationIssue(record));
  }

  return true;
}

function recordMatchesFilters(record, searchQuery, reviewFilter) {
  return recordMatchesSearch(record, searchQuery) && recordMatchesReviewFilter(record, reviewFilter);
}

function getRecordTitle(record) {
  return (
    record.title_ja ??
    record.name_ja ??
    record.summary_ja ??
    record.summary ??
    record.id ??
    "未命名項目"
  );
}

function createVerificationItem(scope, record, targetType, targetId = record.id) {
  const issue = getVerificationIssue(record);
  if (!issue) return null;

  return {
    id: `${scope}:${targetId ?? getRecordTitle(record)}`,
    issue,
    record,
    scope,
    targetId,
    targetType,
    title: getRecordTitle(record),
  };
}

function getRegionEvents(regionId) {
  return events.filter((event) => event.location_id === regionId);
}

function getFlowDestination(flow, regionMap) {
  return regionMap.get(flow.destination_id);
}

function getFlowPath(flow, regionMap) {
  const destination = getFlowDestination(flow, regionMap);
  if (!destination) return [];

  return [
    flow.origin.coordinates,
    ...(flow.via ?? []).map((point) => point.coordinates),
    destination.coordinates,
  ];
}

function getFlowEndpointName(flow, regionMap) {
  const destination = getFlowDestination(flow, regionMap);
  return destination ? destination.name_ja : "未設定の終点";
}

function getFlowLineOptions(flow, selected, mapMode) {
  const config = FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;
  const confidenceDash = {
    documented: selected ? "0" : "14 8",
    reported: "8 10",
    under_investigation: "2 10",
  };

  return {
    color: config.color,
    dashArray: confidenceDash[flow.confidence] ?? "8 10",
    lineCap: "round",
    opacity: selected ? 0.95 : mapMode === "comparison" ? 0.56 : 0.78,
    smoothFactor: 0,
    weight: selected ? 5 : mapMode === "comparison" ? 3 : 4,
    className: `flow-line ${selected ? "selected" : ""} flow-line-${flow.type}`,
  };
}

function getMiddlePoint(points) {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];

  const middleIndex = Math.floor((points.length - 1) / 2);
  const start = points[middleIndex];
  const end = points[middleIndex + 1] ?? points[middleIndex];

  return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
}

function getPathKey(points) {
  return points.map((point) => point.join(",")).join("|");
}

function getPathSegmentMetrics(points) {
  const segments = [];
  let total = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    segments.push({ from, to, length });
    total += length;
  }

  return { segments, total };
}

function getScreenBearing(from, to) {
  const latDelta = to[0] - from[0];
  const lngDelta = to[1] - from[1];
  return (Math.atan2(-latDelta, lngDelta) * 180) / Math.PI;
}

function getLayerPointBearing(from, to) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function getLayerPathMetrics(map, path) {
  const layerPoints = path.map((point) => map.latLngToLayerPoint(L.latLng(point[0], point[1])));
  const segments = [];
  let total = 0;

  for (let index = 0; index < layerPoints.length - 1; index += 1) {
    const from = layerPoints[index];
    const to = layerPoints[index + 1];
    const length = from.distanceTo(to);
    segments.push({ from, to, length });
    total += length;
  }

  return { segments, total };
}

function getPointAlongLayerPath(map, metrics, progress) {
  if (!metrics.segments.length) {
    return { position: [0, 0], bearing: 0 };
  }

  const target = metrics.total * progress;
  let traveled = 0;

  for (const segment of metrics.segments) {
    if (traveled + segment.length >= target || segment === metrics.segments.at(-1)) {
      const segmentProgress = segment.length === 0 ? 0 : (target - traveled) / segment.length;
      const clampedProgress = Math.max(0, Math.min(1, segmentProgress));
      const layerPoint = L.point(
        segment.from.x + (segment.to.x - segment.from.x) * clampedProgress,
        segment.from.y + (segment.to.y - segment.from.y) * clampedProgress,
      );
      const latLng = map.layerPointToLatLng(layerPoint);

      return {
        position: [latLng.lat, latLng.lng],
        bearing: getLayerPointBearing(segment.from, segment.to),
      };
    }

    traveled += segment.length;
  }

  const finalSegment = metrics.segments.at(-1);
  const latLng = map.layerPointToLatLng(finalSegment.to);

  return {
    position: [latLng.lat, latLng.lng],
    bearing: getLayerPointBearing(finalSegment.from, finalSegment.to),
  };
}

function getMotionDurationForMetrics(metrics) {
  if (!metrics.total) return MOTION_MIN_DURATION;

  const duration = (metrics.total / MOTION_SPEED_PIXELS_PER_SECOND) * 1000;
  return Math.max(MOTION_MIN_DURATION, Math.min(MOTION_MAX_DURATION, duration));
}

function getPointAlongPath(metrics, progress) {
  if (!metrics.segments.length) {
    return { position: [0, 0], bearing: 0 };
  }

  const target = metrics.total * progress;
  let traveled = 0;

  for (const segment of metrics.segments) {
    if (traveled + segment.length >= target || segment === metrics.segments.at(-1)) {
      const segmentProgress = segment.length === 0 ? 0 : (target - traveled) / segment.length;
      const clampedProgress = Math.max(0, Math.min(1, segmentProgress));
      const position = [
        segment.from[0] + (segment.to[0] - segment.from[0]) * clampedProgress,
        segment.from[1] + (segment.to[1] - segment.from[1]) * clampedProgress,
      ];

      return {
        position,
        bearing: getScreenBearing(segment.from, segment.to),
      };
    }

    traveled += segment.length;
  }

  const finalSegment = metrics.segments.at(-1);
  return {
    position: finalSegment.to,
    bearing: getScreenBearing(finalSegment.from, finalSegment.to),
  };
}

function getStableOffset(value, duration) {
  const hash = [...value].reduce(
    (current, character) => (current * 31 + character.charCodeAt(0)) % duration,
    0,
  );

  return -hash;
}

function getNaturalEarthFeatureBounds(feature) {
  const [minLng, minLat, maxLng, maxLat] = feature.bbox;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function getFeatureCollectionBounds(featureCollection) {
  const bboxes = featureCollection?.features
    ?.map((feature) => feature.bbox)
    .filter((bbox) => Array.isArray(bbox) && bbox.length === 4);

  if (!bboxes?.length) return null;

  const minLng = Math.min(...bboxes.map((bbox) => bbox[0]));
  const minLat = Math.min(...bboxes.map((bbox) => bbox[1]));
  const maxLng = Math.max(...bboxes.map((bbox) => bbox[2]));
  const maxLat = Math.max(...bboxes.map((bbox) => bbox[3]));

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) return null;

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(color, targetColor, targetAmount) {
  const source = hexToRgb(color);
  const target = hexToRgb(targetColor);
  if (!source || !target) return color;

  return rgbToHex({
    r: source.r * (1 - targetAmount) + target.r * targetAmount,
    g: source.g * (1 - targetAmount) + target.g * targetAmount,
    b: source.b * (1 - targetAmount) + target.b * targetAmount,
  });
}

function addMappedCountryIds(countryIds, value) {
  if (!value) return;

  const normalized = value.toLowerCase();
  const directMap = {
    australia: ["australia"],
    bangladesh: ["bangladesh"],
    cambodia: ["cambodia"],
    china: ["china"],
    hong_kong: ["china"],
    india: ["india"],
    indonesia: ["indonesia"],
    japan: ["japan"],
    malaysia: ["malaysia"],
    myanmar: ["myanmar"],
    nepal: ["nepal"],
    philippines: ["philippines"],
    singapore: ["singapore"],
    "south_asia": SOUTH_ASIA_CONTEXT_COUNTRY_IDS,
    "sri-lanka": ["sri-lanka"],
    "sri_lanka": ["sri-lanka"],
    thailand: ["thailand"],
    uk: ["uk"],
    usa: ["usa"],
    vietnam: ["vietnam"],
  };

  for (const id of directMap[normalized] ?? []) {
    countryIds.add(id);
  }
}

function addCountryIdsFromText(countryIds, text) {
  if (!text) return;

  const matchers = [
    [/アメリカ|米国|united states|usa/i, ["usa"]],
    [/イギリス|英国|united kingdom|uk/i, ["uk"]],
    [/中国|香港|澳門|澳门|china|hong kong|macau/i, ["china"]],
    [/日本|japan/i, ["japan"]],
    [/オーストラリア|australia/i, ["australia"]],
    [/インド|パキスタン|バングラデシュ|ネパール|スリランカ|south asia|南アジア/i, SOUTH_ASIA_CONTEXT_COUNTRY_IDS],
    [/カンボジア|cambodia/i, ["cambodia"]],
    [/ミャンマー|myanmar|burma/i, ["myanmar"]],
    [/タイ|thailand/i, ["thailand"]],
    [/ベトナム|vietnam/i, ["vietnam"]],
    [/フィリピン|philippines/i, ["philippines"]],
    [/マレーシア|malaysia/i, ["malaysia"]],
    [/シンガポール|singapore/i, ["singapore"]],
    [/インドネシア|indonesia/i, ["indonesia"]],
  ];

  for (const [matcher, ids] of matchers) {
    if (matcher.test(text)) {
      for (const id of ids) countryIds.add(id);
    }
  }
}

function getRelatedCountryIdsForGlobalFlow(flow) {
  const countryIds = new Set();
  if (!flow) return countryIds;

  addCountryIdsFromText(countryIds, flow.origin_region);
  addCountryIdsFromText(countryIds, flow.destination_country);
  addCountryIdsFromText(countryIds, flow.destination_region);

  for (const destination of flow.destination_points ?? []) {
    addMappedCountryIds(countryIds, destination.id);
    addMappedCountryIds(countryIds, destination.country_code);
    addCountryIdsFromText(countryIds, destination.name_ja);
    addCountryIdsFromText(countryIds, destination.name_en);
  }

  return countryIds;
}

function getCountryPolygonStyle(feature, countryMap, selectedCountryId, relatedCountryIds) {
  const appId = feature.properties.app_id;
  const country = countryMap.get(appId);
  const contextCountry = CONTEXT_COUNTRY_MAP.get(appId);
  const selected = country?.id === selectedCountryId;
  const context = Boolean(contextCountry && !country);
  const related = context && relatedCountryIds.has(appId);
  const color = country?.color ?? contextCountry?.color ?? CONTEXT_COUNTRY_COLOR;
  const strokeColor = context ? mixHexColors(color, "#dce4dd", 0.2) : color;

  return {
    color: selected ? color : strokeColor,
    fillColor: color,
    fillOpacity: context ? (related ? 0.11 : 0.045) : selected ? 0.19 : 0.06,
    opacity: context ? (related ? 0.58 : 0.34) : selected ? 0.96 : 0.5,
    weight: context ? (related ? 1.45 : 0.95) : selected ? 3 : 1.35,
    className: `country-outline ${selected ? "selected" : ""} ${context ? "context-country" : ""} ${related ? "related" : ""}`,
  };
}

function getRegionalHighlightId(featureOrProperties) {
  const properties = featureOrProperties.properties ?? featureOrProperties;
  return `${properties.region_id}:${properties.country_id}:${properties.boundary_id}`;
}

function getRegionalHighlightStyle(
  feature,
  countryMap,
  selectedRegionId,
  selectedRegionalHighlightId,
) {
  const country = countryMap.get(feature.properties.country_id);
  const contextCountry = CONTEXT_COUNTRY_MAP.get(feature.properties.country_id);
  const baseColor = country?.color ?? contextCountry?.color ?? "#a43c48";
  const selectedFeature = getRegionalHighlightId(feature) === selectedRegionalHighlightId;
  const selectedRegion = feature.properties.region_id === selectedRegionId;
  const adminBoundary = feature.properties.source_kind === "geoboundaries_gbopen_adm2";

  return {
    color: mixHexColors(baseColor, "#050607", selectedFeature ? 0.08 : selectedRegion ? 0.12 : 0.2),
    dashArray: adminBoundary ? null : "7 6",
    fillColor: mixHexColors(baseColor, "#050607", 0.08),
    fillOpacity: selectedFeature ? 0.38 : selectedRegion ? 0.31 : 0.22,
    lineJoin: "round",
    opacity: selectedFeature ? 0.96 : selectedRegion ? 0.84 : 0.64,
    weight: selectedFeature ? 2.8 : selectedRegion ? 2.1 : 1.35,
    bubblingMouseEvents: false,
    className: `regional-highlight-area interactive ${adminBoundary ? "admin-boundary" : "generalized-area"} ${selectedRegion ? "selected" : ""} ${selectedFeature ? "selected-feature" : ""}`,
  };
}

function normalizeGlobalEndpoint(origin, endpoint) {
  if (!origin || !endpoint) return endpoint;

  const [lat, lng] = endpoint;
  const normalizedLng = lng < origin[1] - 120 ? lng + 360 : lng;
  return [lat, normalizedLng];
}

function getCurvedGlobalPathBetween(origin, endpoint) {
  if (!origin || !endpoint) return [];

  const destination = normalizeGlobalEndpoint(origin, endpoint);
  const lngDelta = Math.abs(destination[1] - origin[1]);
  const lift = Math.min(24, Math.max(5, lngDelta / 8));
  const control = [
    (origin[0] + destination[0]) / 2 + lift,
    (origin[1] + destination[1]) / 2,
  ];

  return Array.from({ length: 32 }, (_, index) => {
    const t = index / 31;
    const oneMinusT = 1 - t;
    const lat =
      oneMinusT * oneMinusT * origin[0] +
      2 * oneMinusT * t * control[0] +
      t * t * destination[0];
    const lng =
      oneMinusT * oneMinusT * origin[1] +
      2 * oneMinusT * t * control[1] +
      t * t * destination[1];

    return [lat, lng];
  });
}

function getGlobalFlowPrimaryDestination(flow) {
  return flow.primary_destination_coordinates_approx ??
    flow.destination_points?.[0]?.coordinates ??
    flow.destination_coordinates_approx;
}

function getCurvedGlobalPath(flow) {
  return getCurvedGlobalPathBetween(
    flow.origin_coordinates_approx,
    getGlobalFlowPrimaryDestination(flow),
  );
}

function getGlobalFlowDestinationPaths(flow) {
  if (!flow.destination_points?.length) {
    const path = getCurvedGlobalPath(flow);
    return path.length > 1 ? [{ id: flow.id, path, destination: null }] : [];
  }

  return flow.destination_points
    .map((destination) => ({
      id: `${flow.id}:${destination.id}`,
      destination,
      path: getCurvedGlobalPathBetween(flow.origin_coordinates_approx, destination.coordinates),
    }))
    .filter((entry) => entry.path.length > 1);
}

function getMotionKindFromType(type) {
  return FLOW_TYPE_MOTION_KIND[type] ?? "network";
}

function getMotionKey(kind, id) {
  return `${kind}:${id}`;
}

function getEndpointBadge(endpoint) {
  return endpoint.badge ?? ENDPOINT_BADGES[endpoint.id] ?? endpoint.name_en.slice(0, 2).toUpperCase();
}

function getDestinationPointBadge(destination) {
  return (
    destination.badge ??
    DESTINATION_POINT_BADGES[destination.id] ??
    destination.country_code ??
    destination.name_en?.slice(0, 2).toUpperCase() ??
    destination.name_ja.slice(0, 2)
  );
}

function shouldShowMotion(motionMode, activeMotionKeys, key, selected = false) {
  return motionMode === "always" || (selected && activeMotionKeys.has(key));
}

function getGlobalFlowLineOptions(flow, selected) {
  const config = GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;
  const confidenceDash = {
    documented: selected ? "0" : "18 9",
    reported: "9 10",
    inferred: "4 10",
    under_investigation: "2 10",
  };

  return {
    color: config.color,
    dashArray: confidenceDash[flow.evidence_level] ?? "9 10",
    lineCap: "round",
    opacity: selected ? 0.96 : 0.62,
    smoothFactor: 0,
    weight: selected ? 5 : 3,
    className: `global-flow-line ${selected ? "selected" : ""} global-flow-${flow.connection_type}`,
  };
}

function getGlobalFlowFanLineOptions(flow) {
  const config = GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;

  return {
    color: config.color,
    dashArray: "3 12",
    lineCap: "round",
    opacity: 0.38,
    smoothFactor: 0,
    weight: 2.2,
    className: "global-flow-fan-line",
  };
}

function getAnalysisCorridorOptions(corridor, selected) {
  const config = LAYER_CONFIG[corridor.layer_id] ?? LAYER_CONFIG.governance_method;
  const sourceDash = {
    public_documented: selected ? "0" : "18 9",
    cc_knowledge: "12 8",
    user_synthesis: "10 7",
    needs_verification: "4 9",
  };

  return {
    color: config.color,
    dashArray: sourceDash[corridor.source_status] ?? "6 9",
    lineCap: "round",
    lineJoin: "round",
    opacity: selected ? 0.94 : 0.64,
    smoothFactor: 0,
    weight: selected ? 5 : 3.2,
    className: `analysis-corridor-line ${selected ? "selected" : ""} analysis-${corridor.layer_id}`,
  };
}

function getSelectedCorridorOptions(border) {
  return getSelectedCorridorTraceOptions(border, "fallback");
}

function getSelectedCorridorTraceOptions(border, variant = "core") {
  const maritime = MARITIME_CORRIDOR_IDS.has(border.id);
  const isHalo = variant === "halo";
  const isFallback = variant === "fallback";

  return {
    color: border.color,
    lineCap: "round",
    lineJoin: "round",
    opacity: isHalo ? (maritime ? 0.2 : 0.18) : isFallback ? 0.68 : 0.94,
    smoothFactor: 0,
    weight: isHalo ? (maritime ? 10 : 9) : isFallback ? (maritime ? 6 : 5.5) : maritime ? 3.2 : 3.4,
    className: `selected-corridor-line ${maritime ? "maritime" : "land"} ${variant}`,
  };
}

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createVisualAssetMarkup(src, label, className = "map-visual-symbol") {
  if (!src) return "";

  return `<img class="${className}" src="${src}" alt="" aria-hidden="true" title="${escapeHtmlAttribute(
    label,
  )}" draggable="false" />`;
}

function createRouteEndpointMarkup(role, label) {
  const safeLabel = escapeHtmlAttribute(label);

  return `
    <span
      aria-hidden="true"
      class="route-endpoint-symbol ${role === "origin" ? "origin" : "destination"}"
      title="${safeLabel}"
    ></span>
  `;
}

function getRegionThemeIds(region, activeLayers) {
  return REGION_THEME_LAYERS.filter(
    (layerId) => activeLayers[layerId] && region.layer_tags.includes(layerId),
  );
}

function getPreferredRegionTheme(region, activeLayers, preferredLayerId) {
  const themeIds = getRegionThemeIds(region, activeLayers);

  if (preferredLayerId && themeIds.includes(preferredLayerId)) {
    return preferredLayerId;
  }

  return themeIds[0] ?? region.layer_tags.find((layerId) => REGION_THEME_LAYERS.includes(layerId));
}

function createRegionClusterIcon(themeIds, selectedLayerId, selectedRegion, compact) {
  const shouldCompact = compact && !selectedRegion;
  const primaryLayerId =
    selectedLayerId && themeIds.includes(selectedLayerId) ? selectedLayerId : themeIds[0];
  const visibleThemeIds = shouldCompact ? [primaryLayerId].filter(Boolean) : themeIds;
  const hiddenThemeCount = shouldCompact
    ? Math.max(0, themeIds.length - visibleThemeIds.length)
    : 0;
  const tokens = visibleThemeIds
    .map((layerId) => {
      const config = LAYER_CONFIG[layerId];
      const active = layerId === selectedLayerId ? "active" : "";
      const visual = LAYER_VISUALS[layerId];
      const visualMarkup =
        createVisualAssetMarkup(visual, config.label, "map-token-visual") ??
        (LAYER_MARKER_GLYPHS[layerId] ?? config.icon);

      return `
        <span
          class="theme-cluster-token ${active}"
          data-layer-id="${layerId}"
          style="--marker-color: ${config.color}; --marker-fill: ${config.fill ?? config.color};"
          title="${config.label}"
        >
          ${visualMarkup || LAYER_MARKER_GLYPHS[layerId] || config.icon}
        </span>
      `;
    })
    .join("");
  const countBadge =
    hiddenThemeCount > 0 ? `<span class="theme-count-badge">+${hiddenThemeCount}</span>` : "";
  const width = shouldCompact ? (hiddenThemeCount > 0 ? 58 : 34) : Math.max(42, themeIds.length * 31 + 10);
  const height = shouldCompact ? 30 : 36;

  return L.divIcon({
    className: "",
    html: `
      <div class="theme-cluster ${shouldCompact ? "compact" : ""} ${selectedRegion ? "selected" : ""}">
        ${tokens}
        ${countBadge}
      </div>
    `,
    iconAnchor: [width / 2, height / 2],
    iconSize: [width, height],
    popupAnchor: [0, shouldCompact ? -12 : -16],
  });
}

function createEventIcon() {
  const config = LAYER_CONFIG.timeline_events;
  const visual = LAYER_VISUALS.timeline_events;

  return L.divIcon({
    className: "",
    html: `
      <div
        class="event-map-marker"
        style="--marker-color: ${config.color}; --marker-fill: ${config.fill};"
      >
        <span>
          ${
            createVisualAssetMarkup(visual, config.label, "map-token-visual") ||
            `<svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 4v5l3 2" />
              <path d="M5 12a7 7 0 1 0 2-5" />
              <path d="M4 4v5h5" />
            </svg>`
          }
        </span>
      </div>
    `,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
    popupAnchor: [0, -14],
  });
}

function createFlowNodeIcon(role, selected = false) {
  const roleClass = role === "origin" ? "origin" : "destination";
  const label = role === "origin" ? "起点" : "終点";

  return L.divIcon({
    className: "",
    html: `
      <div class="flow-node ${roleClass} ${selected ? "selected" : ""}" aria-label="${label}" title="${label}">
        ${createRouteEndpointMarkup(role, label)}
      </div>
    `,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
    popupAnchor: [0, -12],
  });
}

function createFlowArrowIcon(flow, selected = false) {
  const config = FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;

  return L.divIcon({
    className: "",
    html: `
      <div
        class="flow-arrow ${selected ? "selected" : ""}"
        style="--flow-color: ${config.color}; --flow-fill: ${config.fill};"
      >
        <span></span>
      </div>
    `,
    iconAnchor: [13, 13],
    iconSize: [26, 26],
  });
}

function createMovingFlowPulseIcon(color, fill, motionKind = "network", selected = false) {
  const kind = MOTION_KIND_CONFIG[motionKind] ?? MOTION_KIND_CONFIG.network;
  const visual = MOTION_VISUALS[motionKind];

  return L.divIcon({
    className: "",
    html: `
      <div
        class="moving-flow-pulse ${kind.className} ${selected ? "selected" : ""}"
        style="--pulse-color: ${color}; --pulse-fill: ${fill ?? "#ffffff"};"
        title="${kind.label}"
      >
        <span>${
          createVisualAssetMarkup(visual, kind.label, "map-pulse-visual") || kind.glyph
        }</span>
      </div>
    `,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });
}

function createDirectionalEndpointIcon(role, color, fill, selected = false) {
  const roleClass = role === "origin" ? "origin" : "destination";
  const label = role === "origin" ? "起点" : "終点";

  return L.divIcon({
    className: "",
    html: `
      <div
        class="direction-endpoint ${roleClass} ${selected ? "selected" : ""}"
        style="--endpoint-color: ${color}; --endpoint-fill: ${fill ?? "#ffffff"};"
        aria-label="${label}"
        title="${label}"
      >
        ${createRouteEndpointMarkup(role, label)}
      </div>
    `,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
    popupAnchor: [0, -12],
  });
}

function createGlobalFlowIcon(flow, selected = false) {
  const config = GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;
  const visual = GLOBAL_FLOW_VISUALS[flow.connection_type];

  return L.divIcon({
    className: "",
    html: `
      <div
        class="global-flow-node ${selected ? "selected" : ""}"
        style="--global-flow-color: ${config.color}; --global-flow-fill: ${config.fill};"
      >
        ${createVisualAssetMarkup(visual, config.label, "map-node-visual") || config.icon}
      </div>
    `,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
    popupAnchor: [0, -12],
  });
}

function createGlobalFlowEndpointIcon(flow, role, selected = false) {
  const config = GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;
  return createDirectionalEndpointIcon(role, config.color, config.fill, selected);
}

function createEndpointIcon(endpoint, highlighted = false) {
  const label = getEndpointBadge(endpoint);

  return L.divIcon({
    className: "",
    html: `<div class="endpoint-node ${highlighted ? "highlighted" : ""}">${label}</div>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36],
    popupAnchor: [0, -16],
  });
}

function createDestinationPointIcon(destination, color, highlighted = false) {
  const label = getDestinationPointBadge(destination);

  return L.divIcon({
    className: "",
    html: `
      <div
        class="destination-point-node ${highlighted ? "highlighted" : ""}"
        style="--destination-color: ${color};"
      >
        ${label}
      </div>
    `,
    iconAnchor: [17, 17],
    iconSize: [34, 34],
    popupAnchor: [0, -14],
  });
}

function createAnalysisNodeIcon(node, selected = false) {
  const config = LAYER_CONFIG[node.layer_id] ?? LAYER_CONFIG.governance_method;
  const label = config.icon || node.name_ja.slice(0, 1);
  const visual = LAYER_VISUALS[node.layer_id];

  return L.divIcon({
    className: "",
    html: `
      <div
        class="analysis-node ${node.layer_id} ${selected ? "selected" : ""}"
        style="--analysis-color: ${config.color}; --analysis-fill: ${config.fill ?? config.color};"
      >
        ${createVisualAssetMarkup(visual, config.label, "map-node-visual") || label}
      </div>
    `,
    iconAnchor: [13, 13],
    iconSize: [26, 26],
    popupAnchor: [0, -12],
  });
}

function createAnalysisEndpointIcon(corridor, role, selected = false) {
  const config = LAYER_CONFIG[corridor.layer_id] ?? LAYER_CONFIG.governance_method;
  return createDirectionalEndpointIcon(role, config.color, config.fill, selected);
}

function createBorderCorridorIcon(border, selected = false) {
  const maritime = MARITIME_CORRIDOR_IDS.has(border.id);
  const label = BORDER_SHORT_LABELS[border.id] ?? border.name_ja;
  const kindLabel = BORDER_KIND_LABELS[border.id] ?? (maritime ? "海上回廊" : "陸上回廊");
  const visual = maritime ? VISUAL_ASSETS.maritime : VISUAL_ASSETS.borderRisk;

  return L.divIcon({
    className: "",
    html: `
      <div
        class="border-corridor-label ${selected ? "selected" : ""} ${maritime ? "maritime" : "land"}"
        style="--corridor-color: ${border.color};"
      >
        <span class="border-corridor-symbol" title="${kindLabel}">
          ${createVisualAssetMarkup(visual, kindLabel, "map-corridor-visual")}
        </span>${label}
      </div>
    `,
    iconAnchor: [64, 14],
    iconSize: [128, 28],
    popupAnchor: [0, -14],
  });
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${dateString}T00:00:00`));
}

function MapFocus({
  selectedAnalysisCorridor,
  selectedAnalysisNode,
  mapMode,
  regionMap,
  selectedBorder,
  selectedCorridorFeatureCollection,
  selectedCountry,
  selectedCountryFeature,
  selectedFlow,
  selectedGlobalFlow,
  selectedRegion,
  selectedRegionalHighlightPosition,
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedAnalysisCorridor) {
      map.fitBounds(selectedAnalysisCorridor.path, {
        animate: true,
        duration: 0.55,
        padding: [54, 54],
      });
      return;
    }

    if (selectedAnalysisNode) {
      map.flyTo(selectedAnalysisNode.coordinates, mapMode === "global" ? 4.5 : 5.8, {
        duration: 0.6,
      });
      return;
    }

    if (selectedGlobalFlow) {
      const path = getCurvedGlobalPath(selectedGlobalFlow);
      if (path.length > 1) {
        map.fitBounds(path, { animate: true, duration: 0.55, padding: [48, 48] });
        return;
      }
    }

    if (selectedBorder) {
      const corridorBounds = getFeatureCollectionBounds(selectedCorridorFeatureCollection);
      map.fitBounds(corridorBounds ?? selectedBorder.path, {
        animate: true,
        duration: 0.5,
        padding: [56, 56],
      });
      return;
    }

    if (selectedCountry && selectedCountryFeature) {
      map.fitBounds(getNaturalEarthFeatureBounds(selectedCountryFeature), {
        animate: true,
        duration: 0.5,
        padding: [54, 54],
      });
      return;
    }

    if (selectedRegionalHighlightPosition) {
      return;
    }

    if (mapMode === "global") {
      map.fitBounds(GLOBAL_MAP_BOUNDS, { animate: true, duration: 0.65, padding: [30, 30] });
      return;
    }

    if (mapMode === "geography") {
      map.fitBounds(SEA_MAP_BOUNDS, { animate: true, duration: 0.55, padding: [36, 36] });
      return;
    }

    if (selectedFlow) {
      const path = getFlowPath(selectedFlow, regionMap);
      if (path.length > 1) {
        map.fitBounds(path, { animate: true, duration: 0.5, padding: [44, 44] });
        return;
      }
    }

    if (selectedRegion) {
      map.flyTo(selectedRegion.coordinates, 6, { duration: 0.6 });
    }
  }, [
    map,
    mapMode,
    regionMap,
    selectedAnalysisCorridor,
    selectedAnalysisNode,
    selectedBorder,
    selectedCorridorFeatureCollection,
    selectedCountry,
    selectedCountryFeature,
    selectedFlow,
    selectedGlobalFlow,
    selectedRegion,
    selectedRegionalHighlightPosition,
  ]);

  return null;
}

function MapZoomSync({ onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    const syncZoom = () => onZoomChange(map.getZoom());

    syncZoom();
    map.on("zoomend", syncZoom);

    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function MovingFlowPulse({
  color,
  fill,
  motionKind = "network",
  offsetSeed,
  path,
  selected = false,
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const pathKey = getPathKey(path);

  useEffect(() => {
    if (path.length < 2) return undefined;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) return undefined;

    const initialMetrics = getLayerPathMetrics(map, path);
    if (initialMetrics.total === 0) return undefined;

    const initialDuration = getMotionDurationForMetrics(initialMetrics);
    const seed = offsetSeed ?? pathKey;
    const phaseOffset = getStableOffset(seed, Math.round(initialDuration));

    const marker = L.marker(path[0], {
      icon: createMovingFlowPulseIcon(color, fill, motionKind, selected),
      interactive: false,
      keyboard: false,
      zIndexOffset: selected ? 940 : 560,
    }).addTo(map);
    markerRef.current = marker;

    let frameId;
    const animate = (now) => {
      const metrics = getLayerPathMetrics(map, path);
      if (metrics.total === 0) {
        frameId = requestAnimationFrame(animate);
        return;
      }
      const duration = getMotionDurationForMetrics(metrics);
      const progress = ((((now + phaseOffset) % duration) + duration) % duration) / duration;
      const nextPoint = getPointAlongLayerPath(map, metrics, progress);
      marker.setLatLng(nextPoint.position);
      marker.getElement()?.style.setProperty("--flow-angle", `${nextPoint.bearing}deg`);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      marker.remove();
      markerRef.current = null;
    };
  }, [color, fill, map, motionKind, offsetSeed, pathKey, selected]);

  return null;
}

function SourceLinks({ sources = [] }) {
  if (!sources.length) {
    return (
      <p className="source-missing">
        <SourceStatusBadge value="missing_sources" />
      </p>
    );
  }

  return (
    <ul className="source-list" aria-label="出典リンク">
      {sources.map((source, index) => {
        const key = typeof source === "string" ? `${source}-${index}` : source.url || source.title;

        return (
          <li key={key}>
            {typeof source === "string" ? (
              <span>{source}</span>
            ) : source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
            ) : (
              <span>{source.title}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReferenceLinks({ sources = [] }) {
  if (!sources.length) return null;

  return (
    <ul className="source-list" aria-label="出典リンク">
      {sources.map((source, index) => {
        const key = typeof source === "string" ? `${source}-${index}` : source.url || source.title;

        return (
          <li key={key}>
            {typeof source === "string" ? (
              <span>{source}</span>
            ) : source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
            ) : (
              <span>{source.title}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ConfidenceBadge({ value }) {
  const meta = CONFIDENCE_META[value] ?? CONFIDENCE_META.reported;

  return (
    <span className={meta.className} title={meta.detail}>
      {meta.label}
    </span>
  );
}

function EvidenceBadge({ value }) {
  const meta = EVIDENCE_META[value] ?? EVIDENCE_META.reported;

  return (
    <span className={meta.className} title={meta.detail}>
      {meta.label}
    </span>
  );
}

function SourceStatusBadge({ value }) {
  const meta = SOURCE_STATUS_META[value] ?? SOURCE_STATUS_META.needs_verification;

  return (
    <span className={meta.className} title={meta.detail}>
      {meta.label}
    </span>
  );
}

function SourceHealthBadge({ record }) {
  const issue = getVerificationIssue(record);
  if (!issue) return null;

  return issue.kind === "source" ? (
    <SourceStatusBadge value={issue.value} />
  ) : (
    <EvidenceBadge value={issue.value} />
  );
}

function EmptyList({ label = "該当項目なし" }) {
  return <div className="empty-list">{label}</div>;
}

function VisualAsset({ className = "ui-visual-symbol", label, src }) {
  if (!src) return null;

  return <img aria-hidden="true" className={className} draggable="false" src={src} title={label} />;
}

function SearchFilterPanel({
  onClear,
  onReviewFilterChange,
  onSearchChange,
  resultCount,
  reviewFilter,
  searchQuery,
  totalCount,
}) {
  const hasActiveFilter = searchQuery.trim() || reviewFilter !== "all";

  return (
    <div className="filter-panel">
      <label className="search-field">
        <span>検索</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="地域、組織、経路、タグ"
          type="search"
          value={searchQuery}
        />
      </label>

      <div className="filter-chip-row" role="group" aria-label="検証状態で絞り込み">
        {DATA_FILTERS.map((filter) => (
          <button
            aria-pressed={reviewFilter === filter.id}
            className={reviewFilter === filter.id ? "active" : ""}
            key={filter.id}
            onClick={() => onReviewFilterChange(filter.id)}
            title={filter.description}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="filter-summary">
        <span>
          {resultCount} / {totalCount}
        </span>
        {hasActiveFilter && (
          <button onClick={onClear} type="button">
            解除
          </button>
        )}
      </div>
    </div>
  );
}

function VerificationQueue({ items, onSelectItem }) {
  if (!items.length) {
    return <EmptyList label="検証キューなし" />;
  }

  return (
    <div className="verification-list">
      {items.map((item) => {
        const selectable = Boolean(item.targetType && item.targetId);

        return (
          <article className="verification-card" key={item.id}>
            <button
              disabled={!selectable}
              onClick={() => selectable && onSelectItem(item)}
              type="button"
            >
              <span className="card-kicker">{item.scope}</span>
              <strong>{item.title}</strong>
              <SourceHealthBadge record={item.record} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function StoryPanel({ activeStepId, onSelectStep }) {
  const activeStep = STORY_STEPS.find((step) => step.id === activeStepId) ?? STORY_STEPS[0];
  const activeIndex = STORY_STEPS.findIndex((step) => step.id === activeStep.id);
  const previousStep = STORY_STEPS[(activeIndex + STORY_STEPS.length - 1) % STORY_STEPS.length];
  const nextStep = STORY_STEPS[(activeIndex + 1) % STORY_STEPS.length];

  return (
    <div className="story-panel">
      <div className="story-step-row" role="group" aria-label="ストーリー順">
        {STORY_STEPS.map((step, index) => (
          <button
            aria-label={`${index + 1}. ${step.kicker}`}
            aria-pressed={activeStep.id === step.id}
            className={activeStep.id === step.id ? "active" : ""}
            key={step.id}
            onClick={() => onSelectStep(step)}
            title={`${index + 1}. ${step.kicker}`}
            type="button"
          >
            <span className="story-step-number">{index + 1}</span>
            <VisualAsset
              className="story-step-visual"
              label={step.label}
              src={STORY_VISUALS[step.id]}
            />
            <span className="story-step-label">{step.label}</span>
          </button>
        ))}
      </div>

      <article className="story-card">
        <p className="card-kicker">{activeStep.kicker}</p>
        <h2>{activeStep.title}</h2>
        <p>{activeStep.summary}</p>
        <ReferenceLinks sources={activeStep.sources} />
        <div className="story-nav">
          <button onClick={() => onSelectStep(previousStep)} type="button">
            前へ
          </button>
          <button onClick={() => onSelectStep(nextStep)} type="button">
            次へ
          </button>
        </div>
      </article>
    </div>
  );
}

function RegionCaseStudy({ caseStudy }) {
  if (!caseStudy) return null;

  return (
    <div className="case-study">
      <span className="section-label">実例</span>
      <strong>{caseStudy.title}</strong>
      <dl>
        <div>
          <dt>流入</dt>
          <dd>{caseStudy.inflow}</dd>
        </div>
        <div>
          <dt>事件</dt>
          <dd>{caseStudy.incident}</dd>
        </div>
        <div>
          <dt>被害</dt>
          <dd>{caseStudy.harm}</dd>
        </div>
      </dl>
      <ReferenceLinks sources={caseStudy.sources} />
    </div>
  );
}

function TagRow({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="tag-row">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function TypeExplanation({ description, label = "表示の意味" }) {
  if (!description) return null;

  return (
    <p className="type-explanation">
      <strong>{label}</strong>
      <span>{description}</span>
    </p>
  );
}

function LayerToggle({ layerId, checked, onChange }) {
  const config = LAYER_CONFIG[layerId];
  const visual = LAYER_VISUALS[layerId];

  return (
    <label className="layer-toggle">
      <input
        checked={checked}
        onChange={(event) => onChange(layerId, event.target.checked)}
        type="checkbox"
      />
      <span
        className="layer-icon-swatch"
        style={{ backgroundColor: config.fill ?? config.color, borderColor: config.color }}
      >
        {visual ? <VisualAsset className="layer-icon-visual" label={config.label} src={visual} /> : config.icon}
      </span>
      <span>{config.label}</span>
    </label>
  );
}

function ThemePopup({ layerId, region, onSelect }) {
  const layer = LAYER_CONFIG[layerId];

  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{region.countries.join(" / ")}</p>
        <h2>{region.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": layer.color, "--pill-fill": layer.fill ?? layer.color }}
          >
            {layer.icon} {layer.shortLabel}
          </span>
          <ConfidenceBadge value={region.confidence} />
        </div>
        <p>{LAYER_INSIGHT_COPY[layerId]}</p>
        <p>{region.summary}</p>
        {region.case_study?.incident && (
          <p className="popup-case-example">
            <strong>実例:</strong> {region.case_study.incident}
          </p>
        )}
        <button className="text-command" onClick={() => onSelect(region)} type="button">
          調査パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function CountryPopup({ country, onSelect }) {
  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{country.name_en}</p>
        <h2>{country.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": country.color, "--pill-fill": country.color }}
          >
            国別
          </span>
          <EvidenceBadge value={country.confidence} />
        </div>
        <p>{country.summary_ja}</p>
        <button className="text-command" onClick={() => onSelect(country)} type="button">
          国別パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function BorderPopup({ border, onSelect }) {
  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{border.name_en}</p>
        <h2>{border.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": border.color, "--pill-fill": border.color }}
          >
            国境
          </span>
          <EvidenceBadge value={border.confidence} />
        </div>
        <p>{border.summary_ja}</p>
        <button className="text-command" onClick={() => onSelect(border)} type="button">
          国境パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function RegionalHighlightPopup({ color, countryName, feature, onSelectRegion, region }) {
  const properties = feature.properties;

  return (
    <div className="map-popup regional-highlight-popup">
      <p className="popup-kicker">{countryName}</p>
      <h2>{properties.display_name_ja ?? properties.label_ja}</h2>
      <div className="popup-meta-row">
        <span
          className="popup-layer-pill"
          style={{ "--pill-color": color, "--pill-fill": color }}
        >
          地域境界
        </span>
      </div>
      <dl className="metadata-grid regional-highlight-metadata">
        <div>
          <dt>親地域</dt>
          <dd>{region?.name_ja ?? properties.region_id}</dd>
        </div>
        <div>
          <dt>境界データ</dt>
          <dd>{properties.source_kind}</dd>
        </div>
      </dl>
      <p>{properties.detail_ja}</p>
      <p>{properties.what_happened_ja}</p>
      <p className="regional-highlight-precision">{properties.precision_note}</p>
      {region && (
        <button className="text-command" onClick={() => onSelectRegion(region)} type="button">
          調査パネルで見る
        </button>
      )}
    </div>
  );
}

function GlobalFlowPopup({ flow, onSelectFlow }) {
  const typeMeta = GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;

  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">
          {flow.origin_region} → {flow.destination_region || flow.destination_country}
        </p>
        <h2>{flow.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": typeMeta.color, "--pill-fill": typeMeta.fill }}
          >
            {typeMeta.label}
          </span>
          <EvidenceBadge value={flow.evidence_level} />
        </div>
        <p>{flow.summary_ja}</p>
        <TypeExplanation description={typeMeta.description} label="この線の意味" />
        <button className="text-command" onClick={() => onSelectFlow(flow)} type="button">
          世界接続パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function EndpointPopup({ endpoint }) {
  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{endpoint.name_en}</p>
        <h2>{endpoint.name_ja}</h2>
        <div className="popup-meta-row">
          <EvidenceBadge value={endpoint.evidence_level} />
        </div>
        <p>{endpoint.summary_ja}</p>
      </div>
    </Popup>
  );
}

function AnalysisNodePopup({ node, onSelect }) {
  const layer = LAYER_CONFIG[node.layer_id] ?? LAYER_CONFIG.governance_method;

  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{node.name_en}</p>
        <h2>{node.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": layer.color, "--pill-fill": layer.fill ?? layer.color }}
          >
            {layer.shortLabel}
          </span>
          <SourceStatusBadge value={node.source_status} />
        </div>
        <p>{node.summary_ja}</p>
        <p className="display-note">{node.display_note}</p>
        <button className="text-command" onClick={() => onSelect(node)} type="button">
          分析パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function AnalysisCorridorPopup({ corridor, onSelect }) {
  const layer = LAYER_CONFIG[corridor.layer_id] ?? LAYER_CONFIG.governance_method;

  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">{corridor.title_en}</p>
        <h2>{corridor.title_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": layer.color, "--pill-fill": layer.fill ?? layer.color }}
          >
            {layer.shortLabel}
          </span>
          <SourceStatusBadge value={corridor.source_status} />
        </div>
        <p>{corridor.summary_ja}</p>
        <p className="display-note">{corridor.display_note}</p>
        <button className="text-command" onClick={() => onSelect(corridor)} type="button">
          分析パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function SelectedInvestigationPanel({
  analysisCorridor,
  analysisNode,
  border,
  country,
  flow,
  frameworkMap,
  globalFlow,
  region,
  regionMap,
}) {
  if (analysisNode) {
    const layer = LAYER_CONFIG[analysisNode.layer_id] ?? LAYER_CONFIG.governance_method;

    return (
      <article className="selected-insight-card">
        <p className="card-kicker">分析オーバーレイ</p>
        <h2>{analysisNode.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": layer.color, "--pill-fill": layer.fill ?? layer.color }}
          >
            {layer.label}
          </span>
          <SourceStatusBadge value={analysisNode.source_status} />
        </div>
        <p>{analysisNode.summary_ja}</p>
        <dl className="metadata-grid">
          <div>
            <dt>表示粒度</dt>
            <dd>{analysisNode.display_note}</dd>
          </div>
        </dl>
        <TagRow items={analysisNode.tags} />
        <LectureFrameworkTagList
          frameworkMap={frameworkMap}
          items={analysisNode.lecture_framework_tags}
        />
        <ReferenceLinks sources={analysisNode.sources} />
      </article>
    );
  }

  if (analysisCorridor) {
    const layer = LAYER_CONFIG[analysisCorridor.layer_id] ?? LAYER_CONFIG.governance_method;

    return (
      <article className="selected-insight-card">
        <p className="card-kicker">分析オーバーレイ</p>
        <h2>{analysisCorridor.title_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": layer.color, "--pill-fill": layer.fill ?? layer.color }}
          >
            {layer.label}
          </span>
          <SourceStatusBadge value={analysisCorridor.source_status} />
        </div>
        <p>{analysisCorridor.summary_ja}</p>
        <dl className="metadata-grid">
          <div>
            <dt>方向</dt>
            <dd>{analysisCorridor.directionality === "one_way" ? "起点から終点へ" : "ネットワーク接続"}</dd>
          </div>
          <div>
            <dt>表示粒度</dt>
            <dd>{analysisCorridor.display_note}</dd>
          </div>
        </dl>
        <TagRow items={analysisCorridor.tags} />
        <ReferenceLinks sources={analysisCorridor.sources} />
      </article>
    );
  }

  if (flow) {
    const typeMeta = FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;
    const destinationRegion = getFlowDestination(flow, regionMap);

    return (
      <article className="selected-insight-card">
        <p className="card-kicker">接続</p>
        <h2>{flow.title_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": typeMeta.color, "--pill-fill": typeMeta.fill }}
          >
            {typeMeta.label}
          </span>
          <ConfidenceBadge value={flow.confidence} />
        </div>
        <p>{flow.summary_ja}</p>
        <TypeExplanation description={typeMeta.description} label="この線の意味" />
        <dl className="metadata-grid">
          <div>
            <dt>起点</dt>
            <dd>{flow.origin.name_ja}</dd>
          </div>
          <div>
            <dt>終点</dt>
            <dd>{getFlowEndpointName(flow, regionMap)}</dd>
          </div>
          {destinationRegion && (
            <div>
              <dt>終点地域の背景</dt>
              <dd>{destinationRegion.border_context}</dd>
            </div>
          )}
          <div>
            <dt>表示粒度</dt>
            <dd>{flow.display_note}</dd>
          </div>
        </dl>
        <SourceLinks sources={flow.sources} />
      </article>
    );
  }

  if (globalFlow) {
    const typeMeta =
      GLOBAL_FLOW_CONFIG[globalFlow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;
    const destinationNames =
      globalFlow.destination_points?.map((destination) => destination.name_ja).join(" / ") ||
      globalFlow.destination_region ||
      globalFlow.destination_country;

    return (
      <article className="selected-insight-card">
        <p className="card-kicker">世界接続</p>
        <h2>{globalFlow.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": typeMeta.color, "--pill-fill": typeMeta.fill }}
          >
            {typeMeta.label}
          </span>
          <EvidenceBadge value={globalFlow.evidence_level} />
        </div>
        <p>{globalFlow.summary_ja}</p>
        <TypeExplanation description={typeMeta.description} label="この線の意味" />
        <dl className="metadata-grid">
          <div>
            <dt>起点</dt>
            <dd>{globalFlow.origin_region}</dd>
          </div>
          <div>
            <dt>終点</dt>
            <dd>{destinationNames}</dd>
          </div>
          <div>
            <dt>確認済み</dt>
            <dd>{globalFlow.what_is_confirmed}</dd>
          </div>
          <div>
            <dt>未確認</dt>
            <dd>{globalFlow.what_is_not_confirmed}</dd>
          </div>
          <div>
            <dt>表示粒度</dt>
            <dd>{globalFlow.map_display_note}</dd>
          </div>
        </dl>
        <TagRow items={globalFlow.financial_mechanisms} />
        <ReferenceLinks sources={globalFlow.sources} />
      </article>
    );
  }

  if (border) {
    return (
      <article className="selected-insight-card">
        <p className="card-kicker">国境・回廊</p>
        <h2>{border.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": border.color, "--pill-fill": border.color }}
          >
            国境
          </span>
          <EvidenceBadge value={border.confidence} />
        </div>
        <p>{border.summary_ja}</p>
        <dl className="metadata-grid">
          <div>
            <dt>リスク要因</dt>
            <dd>{border.risk_factors.join(" / ")}</dd>
          </div>
          <div>
            <dt>関連地域</dt>
            <dd>{border.related_regions.join(" / ")}</dd>
          </div>
          <div>
            <dt>表示粒度</dt>
            <dd>{border.map_display_note}</dd>
          </div>
        </dl>
        <TagRow items={border.connection_types} />
        <ReferenceLinks sources={border.sources} />
      </article>
    );
  }

  if (country) {
    return (
      <article className="selected-insight-card">
        <p className="card-kicker">国別</p>
        <h2>{country.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": country.color, "--pill-fill": country.color }}
          >
            {country.name_en}
          </span>
          <EvidenceBadge value={country.confidence} />
        </div>
        <p>{country.summary_ja}</p>
        <dl className="metadata-grid">
          <div>
            <dt>国境文脈</dt>
            <dd>{country.border_context}</dd>
          </div>
          <div>
            <dt>リスク要因</dt>
            <dd>{country.risk_factors.join(" / ")}</dd>
          </div>
          <div>
            <dt>関連地域</dt>
            <dd>{country.related_regions.join(" / ")}</dd>
          </div>
          <div>
            <dt>表示粒度</dt>
            <dd>{country.map_display_note}</dd>
          </div>
        </dl>
        <TagRow items={country.layers} />
        <ReferenceLinks sources={country.sources} />
      </article>
    );
  }

  if (region) {
    const regionRelatedEvents = getRegionEvents(region.id);
    const layerLabels = region.layer_tags
      .map((layerId) => LAYER_CONFIG[layerId]?.label ?? layerId)
      .filter(Boolean);

    return (
      <article className="selected-insight-card">
        <p className="card-kicker">地域</p>
        <h2>{region.name_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": "#2f7476", "--pill-fill": "#d9efec" }}
          >
            {region.countries.join(" / ")}
          </span>
          <ConfidenceBadge value={region.confidence} />
        </div>
        <p>{region.summary}</p>
        <dl className="metadata-grid">
          <div>
            <dt>関係する文脈</dt>
            <dd>{region.border_context}</dd>
          </div>
          <div>
            <dt>リスク要因</dt>
            <dd>{region.risk_factors.join(" / ")}</dd>
          </div>
          <div>
            <dt>表示粒度</dt>
            <dd>{region.display_precision_note}</dd>
          </div>
          <div>
            <dt>最終更新日</dt>
            <dd>{formatDate(region.last_updated)}</dd>
          </div>
        </dl>
        <TagRow items={layerLabels} />
        <RegionCaseStudy caseStudy={region.case_study} />
        <LectureFrameworkTagList
          frameworkMap={frameworkMap}
          items={region.lecture_framework_tags}
        />
        {regionRelatedEvents.length > 0 && (
          <div className="mini-events">
            <span className="section-label">関連イベント</span>
            {regionRelatedEvents.map((event) => (
              <p key={`${event.date}-${event.title_ja}`}>
                <time dateTime={event.date}>{formatDate(event.date)}</time>
                {event.title_ja}
              </p>
            ))}
          </div>
        )}
        <SourceLinks sources={region.sources} />
      </article>
    );
  }

  return (
    <div className="empty-selection">
      地域、国、国境線、または世界接続線を選択すると、ここに資料がまとまって表示されます。
    </div>
  );
}

function CountryList({ countries, selectedCountryId, onSelectCountry }) {
  if (!countries.length) {
    return <EmptyList />;
  }

  return (
    <div className="geo-list">
      {countries.map((country) => (
        <article
          className={country.id === selectedCountryId ? "geo-card selected" : "geo-card"}
          key={country.id}
        >
          <button onClick={() => onSelectCountry(country)} type="button">
            <span className="card-kicker">{country.name_en}</span>
            <strong>{country.name_ja}</strong>
            <EvidenceBadge value={country.confidence} />
          </button>
          <p>{country.summary_ja}</p>
          <TagRow items={country.risk_factors.slice(0, 4)} />
        </article>
      ))}
    </div>
  );
}

function BorderList({ borders, selectedBorderId, onSelectBorder }) {
  if (!borders.length) {
    return <EmptyList />;
  }

  return (
    <div className="geo-list">
      {borders.map((border) => (
        <article
          className={border.id === selectedBorderId ? "geo-card selected" : "geo-card"}
          key={border.id}
        >
          <button onClick={() => onSelectBorder(border)} type="button">
            <span className="card-kicker">{border.name_en}</span>
            <strong>{border.name_ja}</strong>
            <EvidenceBadge value={border.confidence} />
          </button>
          <p>{border.summary_ja}</p>
          <TagRow items={border.connection_types.slice(0, 4)} />
        </article>
      ))}
    </div>
  );
}

function GlobalFlowList({ flows, selectedGlobalFlowId, onSelectFlow }) {
  if (!flows.length) {
    return <EmptyList />;
  }

  return (
    <div className="flow-list">
      {flows.map((flow) => {
        const typeMeta =
          GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;

        return (
          <article
            className={flow.id === selectedGlobalFlowId ? "flow-card selected" : "flow-card"}
            key={flow.id}
          >
            <button onClick={() => onSelectFlow(flow)} type="button">
              <span className="flow-route">
                {flow.origin_region} → {flow.destination_region || flow.destination_country}
              </span>
              <strong>{flow.name_ja}</strong>
              <span
                className="flow-type-pill"
                style={{ "--flow-color": typeMeta.color, "--flow-fill": typeMeta.fill }}
              >
                {typeMeta.label}
              </span>
            </button>
            <p>{flow.summary_ja}</p>
            <TypeExplanation description={typeMeta.description} label="線の読み方" />
            <p className="display-note">{flow.map_display_note}</p>
          </article>
        );
      })}
    </div>
  );
}

function EndpointList({ endpoints }) {
  if (!endpoints.length) {
    return <EmptyList />;
  }

  return (
    <div className="endpoint-list">
      {endpoints.map((endpoint) => (
        <article className="endpoint-card" key={endpoint.id}>
          <strong>{endpoint.name_ja}</strong>
          <div className="card-badge-stack">
            <EvidenceBadge value={endpoint.evidence_level} />
            <SourceHealthBadge record={endpoint} />
          </div>
          <p>{endpoint.summary_ja}</p>
          <TagRow items={endpoint.role_types} />
        </article>
      ))}
    </div>
  );
}

function AnalysisOverlayList({
  corridors,
  nodes,
  onSelectCorridor,
  onSelectNode,
  selectedAnalysisId,
}) {
  if (!corridors.length && !nodes.length) {
    return <EmptyList />;
  }

  return (
    <div className="analysis-list">
      {corridors.map((corridor) => {
        const layer = LAYER_CONFIG[corridor.layer_id] ?? LAYER_CONFIG.governance_method;
        const selected = selectedAnalysisId === `corridor:${corridor.id}`;

        return (
          <article className={selected ? "analysis-card selected" : "analysis-card"} key={corridor.id}>
            <button onClick={() => onSelectCorridor(corridor)} type="button">
              <span
                className="flow-type-pill"
                style={{ "--flow-color": layer.color, "--flow-fill": layer.fill ?? layer.color }}
              >
                {layer.shortLabel}
              </span>
              <strong>{corridor.title_ja}</strong>
              <SourceStatusBadge value={corridor.source_status} />
            </button>
            <p>{corridor.summary_ja}</p>
          </article>
        );
      })}
      {nodes.map((node) => {
        const layer = LAYER_CONFIG[node.layer_id] ?? LAYER_CONFIG.governance_method;
        const selected = selectedAnalysisId === `node:${node.id}`;

        return (
          <article className={selected ? "analysis-card selected" : "analysis-card"} key={node.id}>
            <button onClick={() => onSelectNode(node)} type="button">
              <span
                className="flow-type-pill"
                style={{ "--flow-color": layer.color, "--flow-fill": layer.fill ?? layer.color }}
              >
                {layer.shortLabel}
              </span>
              <strong>{node.name_ja}</strong>
              <SourceStatusBadge value={node.source_status} />
            </button>
            <p>{node.summary_ja}</p>
          </article>
        );
      })}
    </div>
  );
}

function LectureFrameworkTagList({ items, frameworkMap }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="lecture-framework-tags">
      <span className="section-label">課程資料との接続</span>
      <ul>
        {items.map((tag, idx) => {
          const fw = frameworkMap?.get?.(tag.framework_id);
          const title = fw?.title_ja || tag.framework_id;
          const citation = fw?.citation;
          return (
            <li key={`${tag.framework_id}-${idx}`}>
              <strong>{title}</strong>
              {tag.lens && <span className="lecture-framework-lens">［{tag.lens}］</span>}
              {tag.note && <p>{tag.note}</p>}
              {citation && <p className="lecture-framework-citation">{citation}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FrameworkList({ frameworks, regionMap, analysisNodeMap }) {
  if (!frameworks.length) {
    return <EmptyList />;
  }

  return (
    <div className="framework-list">
      {frameworks.map((framework) => (
        <article className="framework-card" key={framework.id}>
          <div className="framework-title-row">
            <strong>{framework.title_ja}</strong>
            <SourceStatusBadge value={framework.source_status} />
          </div>
          {framework.citation && (
            <p className="framework-citation">
              <span className="framework-citation-label">引用文献</span>
              <span>{framework.citation}</span>
              {framework.course_reference && (
                <span className="framework-course-ref">／{framework.course_reference}</span>
              )}
            </p>
          )}
          <p>{framework.summary_ja}</p>
          <TagRow items={framework.tags} />
          {Array.isArray(framework.applied_to) && framework.applied_to.length > 0 && (
            <div className="framework-applied">
              <span className="framework-applied-label">本作品での適用先</span>
              <ul>
                {framework.applied_to.map((targetId) => {
                  const region = regionMap?.get?.(targetId);
                  const analysisNode = analysisNodeMap?.get?.(targetId);
                  const label =
                    region?.name_ja ||
                    analysisNode?.name_ja ||
                    targetId.replace(/_/g, " ");
                  return <li key={targetId}>{label}</li>;
                })}
              </ul>
            </div>
          )}
          {Array.isArray(framework.sources) && framework.sources.length > 0 && (
            <ReferenceLinks sources={framework.sources} />
          )}
        </article>
      ))}
    </div>
  );
}

function RegionCard({ region, selected, onSelect, frameworkMap }) {
  const relatedEvents = getRegionEvents(region.id);

  return (
    <article className={selected ? "region-card selected" : "region-card"}>
      <button className="region-card-hitarea" onClick={() => onSelect(region)} type="button">
        <span className="card-kicker">{region.countries.join(" / ")}</span>
        <span className="card-title-row">
          <strong>{region.name_ja}</strong>
          <ConfidenceBadge value={region.confidence} />
        </span>
      </button>

      <dl className="metadata-grid">
        <div>
          <dt>関連国境</dt>
          <dd>{region.border_context}</dd>
        </div>
        <div>
          <dt>リスク要因</dt>
          <dd>{region.risk_factors.join(" / ")}</dd>
        </div>
        <div>
          <dt>最終更新日</dt>
          <dd>{formatDate(region.last_updated)}</dd>
        </div>
        {region.display_precision_note && (
          <div>
            <dt>表示粒度</dt>
            <dd>{region.display_precision_note}</dd>
          </div>
        )}
      </dl>

      <p className="region-summary">{region.summary}</p>

      <RegionCaseStudy caseStudy={region.case_study} />

      <LectureFrameworkTagList
        frameworkMap={frameworkMap}
        items={region.lecture_framework_tags}
      />

      {relatedEvents.length > 0 && (
        <div className="mini-events">
          <span className="section-label">関連イベント</span>
          {relatedEvents.map((event) => (
            <p key={`${event.date}-${event.title_ja}`}>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              {event.title_ja}
            </p>
          ))}
        </div>
      )}

      <SourceLinks sources={region.sources} />
    </article>
  );
}

function EventList({ filteredEvents, regionMap, onSelect }) {
  if (!filteredEvents.length) {
    return <EmptyList />;
  }

  return (
    <div className="event-list">
      {filteredEvents.map((event) => {
        const region = regionMap.get(event.location_id);

        return (
          <article className="event-row" key={`${event.date}-${event.location_id}`}>
            <button onClick={() => region && onSelect(region)} type="button">
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              <strong>{event.title_ja}</strong>
              <span>{region?.name_ja ?? "広域"}</span>
            </button>
            <p>{event.summary_ja}</p>
            <SourceLinks sources={event.sources} />
          </article>
        );
      })}
    </div>
  );
}

function FlowPopup({ flow, regionMap, onSelectFlow }) {
  const typeMeta = FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;

  return (
    <Popup>
      <div className="map-popup">
        <p className="popup-kicker">
          {flow.origin.name_ja} → {getFlowEndpointName(flow, regionMap)}
        </p>
        <h2>{flow.title_ja}</h2>
        <div className="popup-meta-row">
          <span
            className="popup-layer-pill"
            style={{ "--pill-color": typeMeta.color, "--pill-fill": typeMeta.fill }}
          >
            {typeMeta.label}
          </span>
          <ConfidenceBadge value={flow.confidence} />
        </div>
        <p>{flow.summary_ja}</p>
        <TypeExplanation description={typeMeta.description} label="この線の意味" />
        <p className="display-note">{flow.display_note}</p>
        <button className="text-command" onClick={() => onSelectFlow(flow)} type="button">
          接続パネルで見る
        </button>
      </div>
    </Popup>
  );
}

function FlowList({ flows: flowItems, selectedFlowId, regionMap, onSelectFlow }) {
  if (!flowItems.length) {
    return <EmptyList />;
  }

  return (
    <div className="flow-list">
      {flowItems.map((flow) => {
        const typeMeta = FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;
        const selected = flow.id === selectedFlowId;

        return (
          <article className={selected ? "flow-card selected" : "flow-card"} key={flow.id}>
            <button onClick={() => onSelectFlow(flow)} type="button">
              <span className="flow-route">
                {flow.origin.name_ja} → {getFlowEndpointName(flow, regionMap)}
              </span>
              <strong>{flow.title_ja}</strong>
              <span
                className="flow-type-pill"
                style={{ "--flow-color": typeMeta.color, "--flow-fill": typeMeta.fill }}
              >
                {typeMeta.label}
              </span>
            </button>
            <p>{flow.summary_ja}</p>
            <TypeExplanation description={typeMeta.description} label="線の読み方" />
            <p className="display-note">{flow.display_note}</p>
            <SourceLinks sources={flow.sources} />
          </article>
        );
      })}
    </div>
  );
}

function MotionKindIcon({ kind }) {
  const config = MOTION_KIND_CONFIG[kind] ?? MOTION_KIND_CONFIG.network;
  const visual = MOTION_VISUALS[kind];

  return (
    <span className={`motion-kind-icon ${config.className}`} title={config.label}>
      {visual ? (
        <VisualAsset className="motion-kind-visual" label={config.label} src={visual} />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: config.glyph }} />
      )}
    </span>
  );
}

function MotionControlPanel({
  active,
  motionMode,
  onMotionModeChange,
  onToggleSelectedMotion,
  selectedLabel,
}) {
  const selectedMode = motionMode === "selected";

  return (
    <div className="motion-panel">
      <p className="motion-panel-note">
        動く点は、物理的な移動だけでなく、資金、制裁、送還、補給などの「作用の向き」も表します。
      </p>
      <div className="motion-mode-control" role="group" aria-label="移動表示">
        {MOTION_MODES.map((mode) => (
          <button
            aria-pressed={motionMode === mode.id}
            className={motionMode === mode.id ? "active" : ""}
            key={mode.id}
            onClick={() => onMotionModeChange(mode.id)}
            title={mode.description}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="motion-legend" aria-label="移動体の種類">
        {MOTION_LEGEND_ORDER.map((kind) => {
          const config = MOTION_KIND_CONFIG[kind];

          return (
            <span className="motion-legend-item" key={kind} title={config.description}>
              <span className="motion-legend-heading">
                <MotionKindIcon kind={kind} />
                <span>{config.label}</span>
              </span>
              <small>{config.description}</small>
            </span>
          );
        })}
      </div>

      {selectedMode && selectedLabel && (
        <button className="motion-selected-toggle" onClick={onToggleSelectedMotion} type="button">
          {active ? "選択経路を停止" : "選択経路を再生"}
        </button>
      )}
    </div>
  );
}

function App() {
  const [mapMode, setMapMode] = useState("comparison");
  const [mapZoom, setMapZoom] = useState(INITIAL_MAP_ZOOM);
  const [activeLayers, setActiveLayers] = useState({
    border_risk: true,
    reported_compound: true,
    casino_sez: true,
    maritime_connection: true,
    casino_online_gambling: true,
    financial_node: true,
    policy_enforcement: true,
    trafficking_route: true,
    china_upstream: true,
    victim_supply: true,
    physical_infrastructure: true,
    financial_trace: true,
    infrastructure_dependency: true,
    entity_detail: true,
    governance_method: true,
    timeline_events: true,
  });
  const [selectedRegionId, setSelectedRegionId] = useState(undefined);
  const [selectedLayerId, setSelectedLayerId] = useState("reported_compound");
  const [selectedFlowId, setSelectedFlowId] = useState(undefined);
  const [selectedCountryId, setSelectedCountryId] = useState(undefined);
  const [selectedBorderId, setSelectedBorderId] = useState(undefined);
  const [selectedGlobalFlowId, setSelectedGlobalFlowId] = useState(undefined);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(undefined);
  const [selectedRegionalHighlightId, setSelectedRegionalHighlightId] = useState(undefined);
  const [selectedRegionalHighlightPosition, setSelectedRegionalHighlightPosition] = useState(null);
  const [yearFilter, setYearFilter] = useState(ALL_YEARS_LABEL);
  const [motionMode, setMotionMode] = useState("always");
  const [activeMotionKeys, setActiveMotionKeys] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [activeStoryStepId, setActiveStoryStepId] = useState(STORY_STEPS[0].id);

  const regionMap = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [],
  );
  const analysisNodeMap = useMemo(
    () => new Map(ANALYSIS_NODES.map((node) => [node.id, node])),
    [],
  );
  const frameworkMap = useMemo(
    () => new Map(ANALYSIS_FRAMEWORKS.map((fw) => [fw.id, fw])),
    [],
  );
  const countryMap = useMemo(
    () => new Map(GEOPOLITICAL_COUNTRIES.map((country) => [country.id, country])),
    [],
  );
  const borderMap = useMemo(
    () => new Map(GEOPOLITICAL_BORDERS.map((border) => [border.id, border])),
    [],
  );
  const naturalEarthFeatureMap = useMemo(
    () =>
      new Map(
        NATURAL_EARTH_COUNTRIES.features.map((feature) => [
          feature.properties.app_id,
          feature,
        ]),
      ),
    [],
  );
  const corridorFeatureCollectionMap = useMemo(() => {
    const grouped = new Map();

    for (const feature of NATURAL_EARTH_CORRIDOR_LINES.features) {
      const borderId = feature.properties.border_id;
      if (!grouped.has(borderId)) {
        grouped.set(borderId, []);
      }
      grouped.get(borderId).push(feature);
    }

    return new Map(
      [...grouped.entries()].map(([borderId, featuresForBorder]) => [
        borderId,
        {
          ...NATURAL_EARTH_CORRIDOR_LINES,
          features: featuresForBorder,
        },
      ]),
    );
  }, []);
  const geographyFeatureCollection = useMemo(
    () => ({
      ...NATURAL_EARTH_COUNTRIES,
      features: NATURAL_EARTH_COUNTRIES.features.filter((feature) =>
        countryMap.has(feature.properties.app_id) || CONTEXT_COUNTRY_MAP.has(feature.properties.app_id),
      ),
    }),
    [countryMap],
  );
  const selectedRegion = regionMap.get(selectedRegionId);
  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId);
  const selectedCountry = countryMap.get(selectedCountryId);
  const selectedCountryFeature = selectedCountryId
    ? naturalEarthFeatureMap.get(selectedCountryId)
    : undefined;
  const selectedBorder = borderMap.get(selectedBorderId);
  const selectedCorridorFeatureCollection = selectedBorderId
    ? corridorFeatureCollectionMap.get(selectedBorderId)
    : undefined;
  const selectedGlobalFlow = GLOBAL_FLOWS.find((flow) => flow.id === selectedGlobalFlowId);
  const selectedGlobalRelatedCountryIds = useMemo(
    () => getRelatedCountryIdsForGlobalFlow(selectedGlobalFlow),
    [selectedGlobalFlow],
  );
  const selectedAnalysisNode = selectedAnalysisId?.startsWith("node:")
    ? ANALYSIS_NODES.find((node) => `node:${node.id}` === selectedAnalysisId)
    : undefined;
  const selectedAnalysisCorridor = selectedAnalysisId?.startsWith("corridor:")
    ? ANALYSIS_CORRIDORS.find((corridor) => `corridor:${corridor.id}` === selectedAnalysisId)
    : undefined;
  const showDistribution = mapMode === "distribution" || mapMode === "comparison";
  const showConnections = mapMode === "connections" || mapMode === "comparison";
  const showGeography = mapMode === "geography" || mapMode === "global";
  const showGlobalFlows = mapMode === "global";
  const showAnalysisOverlays =
    mapMode === "comparison" ||
    mapMode === "connections" ||
    mapMode === "geography" ||
    mapMode === "global";
  const useCompactMarkers = mapZoom < MARKER_EXPANSION_ZOOM;
  const timelineEvents = useMemo(
    () => [...events].sort((left, right) => left.date.localeCompare(right.date)),
    [],
  );
  const yearOptions = useMemo(
    () => [
      ALL_YEARS_LABEL,
      ...[...new Set(timelineEvents.map((event) => event.date.slice(0, 4)))].sort(),
    ],
    [timelineEvents],
  );
  const filteredRegions = useMemo(
    () => regions.filter((region) => recordMatchesFilters(region, searchQuery, reviewFilter)),
    [reviewFilter, searchQuery],
  );
  const filteredFlows = useMemo(
    () => flows.filter((flow) => recordMatchesFilters(flow, searchQuery, reviewFilter)),
    [reviewFilter, searchQuery],
  );
  const filteredCountries = useMemo(
    () =>
      GEOPOLITICAL_COUNTRIES.filter((country) =>
        recordMatchesFilters(country, searchQuery, reviewFilter),
      ),
    [reviewFilter, searchQuery],
  );
  const filteredBorders = useMemo(
    () =>
      GEOPOLITICAL_BORDERS.filter((border) =>
        recordMatchesFilters(border, searchQuery, reviewFilter),
      ),
    [reviewFilter, searchQuery],
  );
  const filteredGlobalFlows = useMemo(
    () => GLOBAL_FLOWS.filter((flow) => recordMatchesFilters(flow, searchQuery, reviewFilter)),
    [reviewFilter, searchQuery],
  );
  const filteredEndpointCountries = useMemo(
    () =>
      ENDPOINT_COUNTRIES.filter((endpoint) =>
        recordMatchesFilters(endpoint, searchQuery, reviewFilter),
      ),
    [reviewFilter, searchQuery],
  );
  const filteredAnalysisNodes = useMemo(
    () => ANALYSIS_NODES.filter((node) => recordMatchesFilters(node, searchQuery, reviewFilter)),
    [reviewFilter, searchQuery],
  );
  const filteredAnalysisCorridors = useMemo(
    () =>
      ANALYSIS_CORRIDORS.filter((corridor) =>
        recordMatchesFilters(corridor, searchQuery, reviewFilter),
      ),
    [reviewFilter, searchQuery],
  );
  const filteredFrameworks = useMemo(
    () =>
      ANALYSIS_FRAMEWORKS.filter((framework) =>
        recordMatchesFilters(framework, searchQuery, reviewFilter),
      ),
    [reviewFilter, searchQuery],
  );
  const dateFilteredEvents = useMemo(() => {
    if (yearFilter === ALL_YEARS_LABEL) {
      return timelineEvents;
    }

    return timelineEvents.filter((event) => event.date.startsWith(yearFilter));
  }, [timelineEvents, yearFilter]);
  const filteredEvents = useMemo(
    () => dateFilteredEvents.filter((event) => recordMatchesFilters(event, searchQuery, reviewFilter)),
    [dateFilteredEvents, reviewFilter, searchQuery],
  );
  const regionalHighlightFeatureCollection = useMemo(() => {
    const visibleRegionIds = new Set(filteredRegions.map((region) => region.id));

    return {
      ...REGIONAL_HIGHLIGHT_AREAS,
      features: REGIONAL_HIGHLIGHT_AREAS.features.filter((feature) =>
        visibleRegionIds.has(feature.properties.region_id),
      ),
    };
  }, [filteredRegions]);
  const selectedRegionalHighlight = useMemo(
    () =>
      selectedRegionalHighlightId
        ? REGIONAL_HIGHLIGHT_AREAS.features.find(
            (feature) => getRegionalHighlightId(feature) === selectedRegionalHighlightId,
          )
        : undefined,
    [selectedRegionalHighlightId],
  );
  const selectedRegionalHighlightRegion = selectedRegionalHighlight
    ? regionMap.get(selectedRegionalHighlight.properties.region_id)
    : undefined;
  const selectedRegionalHighlightCountry = selectedRegionalHighlight
    ? countryMap.get(selectedRegionalHighlight.properties.country_id) ??
      CONTEXT_COUNTRY_MAP.get(selectedRegionalHighlight.properties.country_id)
    : undefined;
  const selectedRegionalHighlightColor =
    selectedRegionalHighlightCountry?.color ??
    (selectedRegionalHighlight ? CONTEXT_COUNTRY_COLOR : "#a43c48");
  const selectedRegionalHighlightCountryName =
    selectedRegionalHighlightCountry?.name_ja ??
    selectedRegionalHighlight?.properties.country_id ??
    "";
  const timelineEventsForMap = useMemo(() => {
    if (useCompactMarkers && selectedRegionId) {
      return filteredEvents.filter((event) => event.location_id === selectedRegionId);
    }

    return filteredEvents;
  }, [filteredEvents, selectedRegionId, useCompactMarkers]);

  const sortedRegions = useMemo(() => {
    return [...filteredRegions].sort((left, right) => {
      if (left.id === selectedRegionId) return -1;
      if (right.id === selectedRegionId) return 1;
      return left.name_ja.localeCompare(right.name_ja, "ja");
    });
  }, [filteredRegions, selectedRegionId]);
  const sortedCountries = useMemo(() => {
    return [...filteredCountries].sort((left, right) => {
      if (left.id === selectedCountryId) return -1;
      if (right.id === selectedCountryId) return 1;
      return left.name_ja.localeCompare(right.name_ja, "ja");
    });
  }, [filteredCountries, selectedCountryId]);
  const sortedBorders = useMemo(() => {
    return [...filteredBorders].sort((left, right) => {
      if (left.id === selectedBorderId) return -1;
      if (right.id === selectedBorderId) return 1;
      return left.name_ja.localeCompare(right.name_ja, "ja");
    });
  }, [filteredBorders, selectedBorderId]);
  const visibleAnalysisNodes = useMemo(
    () => filteredAnalysisNodes.filter((node) => activeLayers[node.layer_id]),
    [activeLayers, filteredAnalysisNodes],
  );
  const visibleAnalysisCorridors = useMemo(
    () => filteredAnalysisCorridors.filter((corridor) => activeLayers[corridor.layer_id]),
    [activeLayers, filteredAnalysisCorridors],
  );
  const totalFilterableCount =
    regions.length +
    flows.length +
    GEOPOLITICAL_COUNTRIES.length +
    GEOPOLITICAL_BORDERS.length +
    GLOBAL_FLOWS.length +
    ENDPOINT_COUNTRIES.length +
    ANALYSIS_NODES.length +
    ANALYSIS_CORRIDORS.length +
    ANALYSIS_FRAMEWORKS.length +
    timelineEvents.length;
  const filteredResultCount =
    filteredRegions.length +
    filteredFlows.length +
    filteredCountries.length +
    filteredBorders.length +
    filteredGlobalFlows.length +
    filteredEndpointCountries.length +
    filteredAnalysisNodes.length +
    filteredAnalysisCorridors.length +
    filteredFrameworks.length +
    filteredEvents.length;
  const verificationItems = useMemo(
    () =>
      [
        ...ANALYSIS_NODES.map((node) =>
          createVerificationItem("分析地点", node, "analysisNode"),
        ),
        ...ANALYSIS_CORRIDORS.map((corridor) =>
          createVerificationItem("分析回廊", corridor, "analysisCorridor"),
        ),
        ...GLOBAL_FLOWS.map((flow) => createVerificationItem("世界接続", flow, "global")),
        ...ENDPOINT_COUNTRIES.map((endpoint) =>
          createVerificationItem("接続先", endpoint, null),
        ),
        ...flows.map((flow) => createVerificationItem("接続", flow, "flow")),
        ...events.map((event) =>
          createVerificationItem("時系列", event, "region", event.location_id),
        ),
        ...regions.map((region) => createVerificationItem("地域", region, "region")),
        ...GEOPOLITICAL_COUNTRIES.map((country) =>
          createVerificationItem("国別", country, "country"),
        ),
        ...GEOPOLITICAL_BORDERS.map((border) =>
          createVerificationItem("国境", border, "border"),
        ),
      ].filter(Boolean),
    [],
  );
  const selectedMotionTarget = selectedGlobalFlow
    ? {
        key: getMotionKey("global", selectedGlobalFlow.id),
        label: selectedGlobalFlow.name_ja,
      }
    : selectedFlow
      ? {
          key: getMotionKey("flow", selectedFlow.id),
          label: selectedFlow.title_ja,
        }
      : selectedAnalysisCorridor
        ? {
            key: getMotionKey("analysis", selectedAnalysisCorridor.id),
            label: selectedAnalysisCorridor.title_ja,
          }
        : null;
  const selectedMotionActive = selectedMotionTarget
    ? activeMotionKeys.has(selectedMotionTarget.key)
    : false;
  const selectedGlobalDestinationPoints = selectedGlobalFlow?.destination_points ?? [];

  const handleLayerToggle = (layerId, checked) => {
    setActiveLayers((current) => ({ ...current, [layerId]: checked }));
  };

  const handleMotionModeChange = (nextMode) => {
    setMotionMode(nextMode);
  };

  const handleMapModeChange = (nextMode) => {
    clearSelectedRegionalHighlight();
    setMapMode(nextMode);
  };

  const handleToggleSelectedMotion = () => {
    if (!selectedMotionTarget) return;

    setActiveMotionKeys((current) => {
      if (current.has(selectedMotionTarget.key)) {
        return new Set();
      }

      return new Set([selectedMotionTarget.key]);
    });
  };

  const clearSelectedRegionalHighlight = () => {
    setSelectedRegionalHighlightId(undefined);
    setSelectedRegionalHighlightPosition(null);
  };

  const handleSelectRegionalHighlight = (feature, latlng) => {
    const region = regionMap.get(feature.properties.region_id);

    setSelectedRegionalHighlightId(getRegionalHighlightId(feature));
    setSelectedRegionalHighlightPosition(
      latlng ? [latlng.lat, latlng.lng] : region?.coordinates ?? null,
    );
    if (region) {
      setSelectedRegionId(region.id);
      setSelectedLayerId(getPreferredRegionTheme(region, activeLayers, selectedLayerId));
    }
    setSelectedFlowId(undefined);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedAnalysisId(undefined);
  };

  const handleSelectRegion = (region, layerId) => {
    if (mapMode === "global" || mapMode === "geography") {
      setMapMode("distribution");
    }
    clearSelectedRegionalHighlight();
    setSelectedRegionId(region.id);
    setSelectedLayerId(getPreferredRegionTheme(region, activeLayers, layerId ?? selectedLayerId));
    setSelectedFlowId(undefined);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedAnalysisId(undefined);
  };

  const handleSelectFlow = (flow) => {
    const destination = getFlowDestination(flow, regionMap);
    if (mapMode === "global" || mapMode === "geography") {
      setMapMode("connections");
    }
    clearSelectedRegionalHighlight();
    setSelectedFlowId(flow.id);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedAnalysisId(undefined);
    if (destination) {
      setSelectedRegionId(destination.id);
      setSelectedLayerId(getPreferredRegionTheme(destination, activeLayers, selectedLayerId));
    }
  };

  const handleSelectCountry = (country) => {
    setMapMode("geography");
    clearSelectedRegionalHighlight();
    setSelectedCountryId(country.id);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
    setSelectedAnalysisId(undefined);
  };

  const handleSelectBorder = (border) => {
    setMapMode("geography");
    clearSelectedRegionalHighlight();
    setSelectedBorderId(border.id);
    setSelectedCountryId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
    setSelectedAnalysisId(undefined);
  };

  const handleSelectGlobalFlow = (flow) => {
    setMapMode("global");
    clearSelectedRegionalHighlight();
    setSelectedGlobalFlowId(flow.id);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
    setSelectedAnalysisId(undefined);
  };

  const handleSelectAnalysisNode = (node) => {
    if (mapMode === "distribution") {
      setMapMode("comparison");
    }
    clearSelectedRegionalHighlight();
    setSelectedAnalysisId(`node:${node.id}`);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
  };

  const handleSelectAnalysisCorridor = (corridor) => {
    if (mapMode === "distribution") {
      setMapMode("comparison");
    }
    clearSelectedRegionalHighlight();
    setSelectedAnalysisId(`corridor:${corridor.id}`);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setReviewFilter("all");
  };

  const handleSelectVerificationItem = (item) => {
    if (item.targetType === "analysisNode") {
      handleSelectAnalysisNode(item.record);
      return;
    }
    if (item.targetType === "analysisCorridor") {
      handleSelectAnalysisCorridor(item.record);
      return;
    }
    if (item.targetType === "global") {
      handleSelectGlobalFlow(item.record);
      return;
    }
    if (item.targetType === "flow") {
      handleSelectFlow(item.record);
      return;
    }
    if (item.targetType === "region") {
      const region = regionMap.get(item.targetId);
      if (region) handleSelectRegion(region);
      return;
    }
    if (item.targetType === "country") {
      handleSelectCountry(item.record);
      return;
    }
    if (item.targetType === "border") {
      handleSelectBorder(item.record);
    }
  };

  const handleSelectStoryStep = (step) => {
    const motionTargetKey =
      step.targetType === "global"
        ? getMotionKey("global", step.targetId)
        : step.targetType === "flow"
          ? getMotionKey("flow", step.targetId)
          : step.targetType === "analysisCorridor"
            ? getMotionKey("analysis", step.targetId)
            : null;

    setActiveStoryStepId(step.id);
    setMapMode(step.mapMode);
    setMotionMode(step.motionMode ?? "always");
    setSearchQuery("");
    setReviewFilter("all");
    setYearFilter(ALL_YEARS_LABEL);
    clearSelectedRegionalHighlight();
    setSelectedRegionId(undefined);
    setSelectedFlowId(undefined);
    setSelectedCountryId(undefined);
    setSelectedBorderId(undefined);
    setSelectedGlobalFlowId(undefined);
    setSelectedAnalysisId(undefined);
    setActiveMotionKeys(
      step.motionMode === "selected" && motionTargetKey ? new Set([motionTargetKey]) : new Set(),
    );

    if (step.targetType === "region") {
      const region = regionMap.get(step.targetId);
      if (region) {
        setSelectedRegionId(region.id);
        setSelectedLayerId(getPreferredRegionTheme(region, activeLayers, step.layerId));
      }
    } else if (step.targetType === "flow") {
      const flow = flows.find((item) => item.id === step.targetId);
      const destination = flow ? getFlowDestination(flow, regionMap) : null;
      setSelectedFlowId(step.targetId);
      if (destination) {
        setSelectedRegionId(destination.id);
        setSelectedLayerId(getPreferredRegionTheme(destination, activeLayers, selectedLayerId));
      }
    } else if (step.targetType === "global") {
      setSelectedGlobalFlowId(step.targetId);
    } else if (step.targetType === "analysisCorridor") {
      setSelectedAnalysisId(`corridor:${step.targetId}`);
    }
  };

  return (
    <main className={`app-shell motion-mode-${motionMode}`}>
      <section
        className="map-stage"
        aria-label="東南アジア国境地帯マップ"
        style={{ "--map-ambient-overlay": `url(${VISUAL_ASSETS.ambientOverlay})` }}
      >
        <div className="map-titlebar">
          <div>
            <p className="eyebrow">Investigative prototype</p>
            <h1>
              <span className="map-title-main">東南アジア特殊詐欺ネットワーク</span>
              <span className="map-title-sub">追跡</span>
            </h1>
          </div>
          <p className="precision-note">
            地域単位で集約。施設位置や精密座標は表示しません。
          </p>
        </div>
        <div className="map-status-strip" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <MapContainer
          center={[8.6, 111.2]}
          className="leaflet-map"
          scrollWheelZoom
          zoom={INITIAL_MAP_ZOOM}
          zoomSnap={0.25}
          zoomControl={false}
        >
          <ZoomControl position="bottomleft" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Boundaries: <a href="https://www.naturalearthdata.com/">Natural Earth</a>, <a href="https://www.geoboundaries.org/">geoBoundaries</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapZoomSync onZoomChange={setMapZoom} />
          <MapFocus
            mapMode={mapMode}
            regionMap={regionMap}
            selectedAnalysisCorridor={selectedAnalysisCorridor}
            selectedAnalysisNode={selectedAnalysisNode}
            selectedBorder={selectedBorder}
            selectedCorridorFeatureCollection={selectedCorridorFeatureCollection}
            selectedCountry={selectedCountry}
            selectedCountryFeature={selectedCountryFeature}
            selectedFlow={selectedFlow}
            selectedGlobalFlow={selectedGlobalFlow}
            selectedRegion={selectedRegion}
            selectedRegionalHighlightPosition={selectedRegionalHighlightPosition}
          />

          {showGeography && (
            <Pane name="country-fill-pane" style={{ zIndex: 390 }}>
              <GeoJSON
                data={geographyFeatureCollection}
                key={`natural-earth-countries-${selectedCountryId ?? "none"}-${selectedGlobalFlowId ?? "none"}-${mapMode}`}
                onEachFeature={(feature, layer) => {
                  const country = countryMap.get(feature.properties.app_id);
                  const contextCountry = CONTEXT_COUNTRY_MAP.get(feature.properties.app_id);
                  if (!country && !contextCountry) return;

                  if (country) {
                    layer.on({ click: () => handleSelectCountry(country) });
                  }
                  layer.bindTooltip(country?.name_ja ?? contextCountry.name_ja, { sticky: true });
                }}
                style={(feature) =>
                  getCountryPolygonStyle(
                    feature,
                    countryMap,
                    selectedCountryId,
                    selectedGlobalRelatedCountryIds,
                  )
                }
              />
            </Pane>
          )}

          {showGeography && regionalHighlightFeatureCollection.features.length > 0 && (
            <GeoJSON
              data={regionalHighlightFeatureCollection}
              interactive
              key={`regional-highlight-areas-${selectedRegionId ?? "none"}-${selectedRegionalHighlightId ?? "none"}-${regionalHighlightFeatureCollection.features
                .map((feature) => feature.properties.boundary_id)
                .join("|")}`}
              onEachFeature={(feature, layer) => {
                const properties = feature.properties;
                layer.options.bubblingMouseEvents = false;
                layer.bindTooltip(properties.display_name_ja ?? properties.label_ja, {
                  sticky: true,
                });
                layer.on({
                  click: (event) => {
                    if (event.originalEvent) {
                      L.DomEvent.stop(event.originalEvent);
                      event.originalEvent.stopImmediatePropagation?.();
                    }
                    handleSelectRegionalHighlight(feature, event.latlng);
                  },
                });
              }}
              style={(feature) =>
                getRegionalHighlightStyle(
                  feature,
                  countryMap,
                  selectedRegionId,
                  selectedRegionalHighlightId,
                )
              }
            />
          )}

          {showGeography &&
            selectedRegionalHighlight &&
            selectedRegionalHighlightPosition && (
              <Popup
                key={`regional-highlight-popup-${selectedRegionalHighlightId}`}
                position={selectedRegionalHighlightPosition}
              >
                <RegionalHighlightPopup
                  color={selectedRegionalHighlightColor}
                  countryName={selectedRegionalHighlightCountryName}
                  feature={selectedRegionalHighlight}
                  onSelectRegion={handleSelectRegion}
                  region={selectedRegionalHighlightRegion}
                />
              </Popup>
            )}

          {showGeography && (
            <GeoJSON
              data={NATURAL_EARTH_MARITIME_BOUNDARIES}
              key="natural-earth-maritime-boundaries"
              style={(feature) => ({
                color:
                  feature.properties.feature_class === "Marine Indicator Disputed"
                    ? "#8ea0c8"
                    : "#5aa7bd",
                dashArray: null,
                opacity:
                  feature.properties.feature_class === "Marine Indicator Disputed" ? 0.2 : 0.24,
                weight:
                  feature.properties.feature_class === "Marine Indicator Treaty" ? 1.25 : 1,
                className: "maritime-boundary-line",
              })}
            />
          )}

          {showGeography &&
            selectedBorder &&
            selectedCorridorFeatureCollection && (
              <>
                <GeoJSON
                  data={selectedCorridorFeatureCollection}
                  interactive={false}
                  key={`selected-corridor-halo-${selectedBorder.id}`}
                  style={() => getSelectedCorridorTraceOptions(selectedBorder, "halo")}
                />
                <GeoJSON
                  data={selectedCorridorFeatureCollection}
                  interactive={false}
                  key={`selected-corridor-core-${selectedBorder.id}`}
                  style={() => getSelectedCorridorTraceOptions(selectedBorder, "core")}
                />
              </>
            )}

          {showGeography &&
            selectedBorder &&
            !selectedCorridorFeatureCollection && (
              <Polyline
                interactive={false}
                key={`selected-corridor-${selectedBorder.id}`}
                pathOptions={getSelectedCorridorOptions(selectedBorder)}
                positions={selectedBorder.path}
              />
            )}

          {showGeography &&
            filteredBorders.map((border) => {
              const selected = border.id === selectedBorderId;
              const middlePoint = getMiddlePoint(border.path);
              if (!middlePoint) return null;

              return (
                <Marker
                  eventHandlers={{ click: () => handleSelectBorder(border) }}
                  icon={createBorderCorridorIcon(border, selected)}
                  key={`border-label-${border.id}`}
                  position={middlePoint}
                  title={border.name_ja}
                  zIndexOffset={selected ? 780 : 520}
                >
                  <Tooltip>{border.name_ja}</Tooltip>
                  <BorderPopup border={border} onSelect={handleSelectBorder} />
                </Marker>
              );
            })}

          {showGlobalFlows &&
            filteredGlobalFlows.map((flow) => {
              const path = getCurvedGlobalPath(flow);
              const selected = flow.id === selectedGlobalFlowId;
              const middlePoint = getMiddlePoint(path);
              const typeConfig =
                GLOBAL_FLOW_CONFIG[flow.connection_type] ?? GLOBAL_FLOW_CONFIG.fraud_targeting;
              const motionKey = getMotionKey("global", flow.id);
              const showMotion = shouldShowMotion(
                motionMode,
                activeMotionKeys,
                motionKey,
                selected,
              );
              const motionKind = getMotionKindFromType(flow.connection_type);
              const destinationPaths = getGlobalFlowDestinationPaths(flow);
              const selectedFanPaths =
                selected && showMotion && flow.destination_points?.length ? destinationPaths : [];
              const visibleMotionPaths = selectedFanPaths.length
                ? selectedFanPaths
                : [{ id: flow.id, path, destination: null }];
              if (path.length < 2) return null;

              return (
                <React.Fragment key={`global-${flow.id}`}>
                  <Polyline
                    eventHandlers={{ click: () => handleSelectGlobalFlow(flow) }}
                    pathOptions={getGlobalFlowLineOptions(flow, selected)}
                    positions={path}
                  >
                    <Tooltip sticky>
                      {`${flow.origin_region} → ${flow.destination_region || flow.destination_country}`}
                    </Tooltip>
                    <GlobalFlowPopup flow={flow} onSelectFlow={handleSelectGlobalFlow} />
                  </Polyline>
                  {selectedFanPaths.map((entry) => (
                    <Polyline
                      interactive={false}
                      key={`global-fan-${entry.id}`}
                      pathOptions={getGlobalFlowFanLineOptions(flow)}
                      positions={entry.path}
                    />
                  ))}
                  {showMotion &&
                    visibleMotionPaths.map((entry) => (
                      <MovingFlowPulse
                        color={typeConfig.color}
                        fill={typeConfig.fill}
                        key={`global-motion-${entry.id}`}
                        motionKind={motionKind}
                        offsetSeed={entry.id}
                        path={entry.path}
                        selected={selected}
                      />
                    ))}
                  <Marker
                    eventHandlers={{ click: () => handleSelectGlobalFlow(flow) }}
                    icon={createGlobalFlowEndpointIcon(flow, "origin", selected)}
                    position={path[0]}
                    title={`起点: ${flow.origin_region}`}
                    zIndexOffset={selected ? 850 : 470}
                  >
                    <Tooltip>{`起点: ${flow.origin_region}`}</Tooltip>
                  </Marker>
                  <Marker
                    eventHandlers={{ click: () => handleSelectGlobalFlow(flow) }}
                    icon={createGlobalFlowEndpointIcon(flow, "destination", selected)}
                    position={path[path.length - 1]}
                    title={`終点: ${flow.destination_region || flow.destination_country}`}
                    zIndexOffset={selected ? 850 : 470}
                  >
                    <Tooltip>{`終点: ${flow.destination_region || flow.destination_country}`}</Tooltip>
                  </Marker>
                  {middlePoint && (
                    <Marker
                      eventHandlers={{ click: () => handleSelectGlobalFlow(flow) }}
                      icon={createGlobalFlowIcon(flow, selected)}
                      position={middlePoint}
                      title={flow.name_ja}
                      zIndexOffset={selected ? 860 : 480}
                    />
                  )}
                  {selected &&
                    flow.destination_points?.map((destination) => {
                      const destinationPosition = normalizeGlobalEndpoint(
                        flow.origin_coordinates_approx,
                        destination.coordinates,
                      );

                      return (
                        <Marker
                          eventHandlers={{ click: () => handleSelectGlobalFlow(flow) }}
                          icon={createDestinationPointIcon(destination, typeConfig.color, showMotion)}
                          key={`global-destination-${flow.id}-${destination.id}`}
                          position={destinationPosition}
                          title={destination.name_ja}
                          zIndexOffset={showMotion ? 875 : 690}
                        >
                          <Tooltip>{destination.name_ja}</Tooltip>
                        </Marker>
                      );
                    })}
                </React.Fragment>
              );
            })}

          {showGlobalFlows &&
            filteredEndpointCountries.map((endpoint) => {
              const coveredBySelectedDestination = selectedGlobalDestinationPoints.some(
                (destination) =>
                  getDestinationPointBadge(destination) === getEndpointBadge(endpoint) &&
                  Math.abs(destination.coordinates[0] - endpoint.coordinates[0]) < 0.5 &&
                  Math.abs(destination.coordinates[1] - endpoint.coordinates[1]) < 0.5,
              );
              if (coveredBySelectedDestination) return null;

              const position = normalizeGlobalEndpoint([8.6, 111.2], endpoint.coordinates);
              const highlighted = Boolean(
                selectedGlobalFlowId && endpoint.related_flows?.includes(selectedGlobalFlowId),
              );

              return (
                <Marker
                  icon={createEndpointIcon(endpoint, highlighted)}
                  key={`endpoint-${endpoint.id}`}
                  position={position}
                  title={endpoint.name_ja}
                  zIndexOffset={highlighted ? 760 : 360}
                >
                  <Tooltip>{endpoint.name_ja}</Tooltip>
                  <EndpointPopup endpoint={endpoint} />
                </Marker>
              );
            })}

          {showAnalysisOverlays &&
            visibleAnalysisCorridors.map((corridor) => {
              const selected = selectedAnalysisId === `corridor:${corridor.id}`;
              const layer = LAYER_CONFIG[corridor.layer_id] ?? LAYER_CONFIG.governance_method;
              const middlePoint = getMiddlePoint(corridor.path);
              const motionKey = getMotionKey("analysis", corridor.id);
              const showMotion = shouldShowMotion(
                motionMode,
                activeMotionKeys,
                motionKey,
                selected,
              );

              return (
                <React.Fragment key={`analysis-corridor-${corridor.id}`}>
                  <Polyline
                    eventHandlers={{ click: () => handleSelectAnalysisCorridor(corridor) }}
                    pathOptions={getAnalysisCorridorOptions(corridor, selected)}
                    positions={corridor.path}
                  >
                    <Tooltip sticky>{corridor.title_ja}</Tooltip>
                    <AnalysisCorridorPopup
                      corridor={corridor}
                      onSelect={handleSelectAnalysisCorridor}
                    />
                  </Polyline>
                  {showMotion && (
                    <MovingFlowPulse
                      color={layer.color}
                      fill={layer.fill}
                      motionKind={getMotionKindFromType(corridor.layer_id)}
                      offsetSeed={corridor.id}
                      path={corridor.path}
                      selected={selected}
                    />
                  )}
                  <Marker
                    eventHandlers={{ click: () => handleSelectAnalysisCorridor(corridor) }}
                    icon={createAnalysisEndpointIcon(corridor, "origin", selected)}
                    position={corridor.path[0]}
                    title={`起点: ${corridor.title_ja}`}
                    zIndexOffset={selected ? 830 : 430}
                  >
                    <Tooltip>{`起点: ${corridor.title_ja}`}</Tooltip>
                  </Marker>
                  <Marker
                    eventHandlers={{ click: () => handleSelectAnalysisCorridor(corridor) }}
                    icon={createAnalysisEndpointIcon(corridor, "destination", selected)}
                    position={corridor.path[corridor.path.length - 1]}
                    title={`終点: ${corridor.title_ja}`}
                    zIndexOffset={selected ? 830 : 430}
                  >
                    <Tooltip>{`終点: ${corridor.title_ja}`}</Tooltip>
                  </Marker>
                  {middlePoint && (
                    <Marker
                      eventHandlers={{ click: () => handleSelectAnalysisCorridor(corridor) }}
                      icon={createAnalysisNodeIcon(
                        {
                          id: `${corridor.id}-mid`,
                          layer_id: corridor.layer_id,
                          name_ja: corridor.title_ja,
                        },
                        selected,
                      )}
                      position={middlePoint}
                      title={corridor.title_ja}
                      zIndexOffset={selected ? 835 : 435}
                    />
                  )}
                </React.Fragment>
              );
            })}

          {showAnalysisOverlays &&
            visibleAnalysisNodes.map((node) => {
              const selected = selectedAnalysisId === `node:${node.id}`;

              return (
                <Marker
                  eventHandlers={{ click: () => handleSelectAnalysisNode(node) }}
                  icon={createAnalysisNodeIcon(node, selected)}
                  key={`analysis-node-${node.id}`}
                  position={node.coordinates}
                  title={node.name_ja}
                  zIndexOffset={selected ? 880 : 560}
                >
                  <Tooltip>{node.name_ja}</Tooltip>
                  <AnalysisNodePopup node={node} onSelect={handleSelectAnalysisNode} />
                </Marker>
              );
            })}

          {showDistribution &&
            activeLayers.border_risk &&
            filteredRegions
              .filter((region) => region.layer_tags.includes("border_risk"))
              .map((region) => (
                <Circle
                  center={region.coordinates}
                  key={`risk-${region.id}`}
                  pathOptions={{
                    color: LAYER_CONFIG.border_risk.color,
                    fillColor: LAYER_CONFIG.border_risk.fill,
                    fillOpacity: region.confidence === "documented" ? 0.12 : 0.08,
                    opacity: 0.34,
                    weight: 1,
                    className: "risk-zone",
                  }}
                  interactive={false}
                  radius={LAYER_CONFIG.border_risk.radius}
                />
              ))}

          {showConnections &&
            activeLayers.trafficking_route &&
            filteredFlows.map((flow) => {
              const path = getFlowPath(flow, regionMap);
              if (path.length < 2) return null;
              const selected = flow.id === selectedFlowId;
              const middlePoint = getMiddlePoint(path);
              const typeConfig =
                FLOW_TYPE_CONFIG[flow.type] ?? FLOW_TYPE_CONFIG.recruitment_route;
              const showConnectionEndpoints = mapMode === "connections" || selected;
              const motionKey = getMotionKey("flow", flow.id);
              const showMotion = shouldShowMotion(
                motionMode,
                activeMotionKeys,
                motionKey,
                selected,
              );

              return (
                <React.Fragment key={flow.id}>
                  <Polyline
                    eventHandlers={{ click: () => handleSelectFlow(flow) }}
                    pathOptions={getFlowLineOptions(flow, selected, mapMode)}
                    positions={path}
                  >
                    <Tooltip sticky>
                      {`${flow.origin.name_ja} → ${getFlowEndpointName(flow, regionMap)}`}
                    </Tooltip>
                    <FlowPopup
                      flow={flow}
                      onSelectFlow={handleSelectFlow}
                      regionMap={regionMap}
                    />
                  </Polyline>
                  {showMotion && (
                    <MovingFlowPulse
                      color={typeConfig.color}
                      fill={typeConfig.fill}
                      motionKind={getMotionKindFromType(flow.type)}
                      offsetSeed={flow.id}
                      path={path}
                      selected={selected}
                    />
                  )}
                  {middlePoint && (
                    <Marker
                      eventHandlers={{ click: () => handleSelectFlow(flow) }}
                      icon={createFlowArrowIcon(flow, selected)}
                      position={middlePoint}
                      title={flow.title_ja}
                      zIndexOffset={selected ? 820 : 430}
                    />
                  )}
                  {showConnectionEndpoints && (
                    <>
                      <Marker
                        eventHandlers={{ click: () => handleSelectFlow(flow) }}
                        icon={createFlowNodeIcon("origin", selected)}
                        position={flow.origin.coordinates}
                        title={flow.origin.name_ja}
                        zIndexOffset={selected ? 800 : 420}
                      >
                        <Tooltip>{flow.origin.name_ja}</Tooltip>
                      </Marker>
                      <Marker
                        eventHandlers={{ click: () => handleSelectFlow(flow) }}
                        icon={createFlowNodeIcon("destination", selected)}
                        position={path[path.length - 1]}
                        title={getFlowEndpointName(flow, regionMap)}
                        zIndexOffset={selected ? 800 : 420}
                      >
                        <Tooltip>{getFlowEndpointName(flow, regionMap)}</Tooltip>
                      </Marker>
                    </>
                  )}
                </React.Fragment>
              );
            })}

          {showDistribution &&
            filteredRegions.map((region) => {
            const themeIds = getRegionThemeIds(region, activeLayers);
            if (themeIds.length === 0) return null;

            const popupLayerId = getPreferredRegionTheme(
              region,
              activeLayers,
              region.id === selectedRegionId ? selectedLayerId : undefined,
            );

            return (
              <Marker
                eventHandlers={{
                  click: (event) => {
                    const clickedLayerId = event.originalEvent?.target
                      ?.closest?.("[data-layer-id]")
                      ?.getAttribute("data-layer-id");
                    handleSelectRegion(region, clickedLayerId ?? popupLayerId);
                  },
                }}
                icon={createRegionClusterIcon(
                  themeIds,
                  popupLayerId,
                  region.id === selectedRegionId,
                  useCompactMarkers,
                )}
                key={`themes-${region.id}-${themeIds.join("-")}-${useCompactMarkers ? "compact" : "expanded"}`}
                position={region.coordinates}
                title={`${region.name_ja} / テーマ別マーカー`}
                zIndexOffset={region.id === selectedRegionId ? 900 : 700}
              >
                <Tooltip direction="top" offset={[0, -15]}>
                  {`${region.name_ja} / ${themeIds
                    .map((layerId) => LAYER_CONFIG[layerId].shortLabel)
                    .join("・")}`}
                </Tooltip>
                <ThemePopup layerId={popupLayerId} onSelect={handleSelectRegion} region={region} />
              </Marker>
            );
          })}

          {showDistribution &&
            activeLayers.timeline_events &&
            (!useCompactMarkers || selectedRegionId) &&
            timelineEventsForMap.map((event, index) => {
              const region = regionMap.get(event.location_id);
              if (!region) return null;
              const [latOffset, lngOffset] = EVENT_MARKER_OFFSETS[index % EVENT_MARKER_OFFSETS.length];

              return (
                <Marker
                  eventHandlers={{ click: () => handleSelectRegion(region) }}
                  icon={createEventIcon()}
                  key={`event-${event.date}-${event.location_id}`}
                  position={[region.coordinates[0] + latOffset, region.coordinates[1] + lngOffset]}
                  title={`${formatDate(event.date)} / ${event.title_ja}`}
                  zIndexOffset={250}
                >
                  <Tooltip>{`${formatDate(event.date)} / ${event.title_ja}`}</Tooltip>
                  <Popup>
                    <div className="map-popup">
                      <p className="popup-kicker">{formatDate(event.date)}</p>
                      <h2>{event.title_ja}</h2>
                      <div className="popup-meta-row">
                        <ConfidenceBadge value={event.confidence} />
                      </div>
                      <p>{event.summary_ja}</p>
                      <SourceLinks sources={event.sources} />
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>
      </section>

      <aside className="research-panel" aria-label="調査パネル">
        <div className="panel-section panel-intro">
          <p className="eyebrow">Borderland structure</p>
          <h2>国境、SEZ、詐欺拠点報告、人の移動を重ねる</h2>
          <p>
            電信詐欺を単独の犯罪としてではなく、統治の弱い国境地帯、カジノ/SEZ経済、
            人身取引、資金洗浄がどう結び付くかを地図で追うためのプロトタイプです。
          </p>
        </div>

        <div className="panel-section">
          <h2>表示モード</h2>
          <div className="mode-control" role="group" aria-label="表示モード">
            {MAP_MODES.map((mode) => (
              <button
                aria-pressed={mapMode === mode.id}
                className={mapMode === mode.id ? "active" : ""}
                key={mode.id}
                onClick={() => handleMapModeChange(mode.id)}
                title={mode.description}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h2>検索・絞り込み</h2>
          <SearchFilterPanel
            onClear={handleClearFilters}
            onReviewFilterChange={setReviewFilter}
            onSearchChange={setSearchQuery}
            resultCount={filteredResultCount}
            reviewFilter={reviewFilter}
            searchQuery={searchQuery}
            totalCount={totalFilterableCount}
          />
        </div>

        <div className="panel-section">
          <h2>ストーリー</h2>
          <StoryPanel activeStepId={activeStoryStepId} onSelectStep={handleSelectStoryStep} />
        </div>

        <div className="panel-section">
          <h2>移動表示</h2>
          <MotionControlPanel
            active={selectedMotionActive}
            motionMode={motionMode}
            onMotionModeChange={handleMotionModeChange}
            onToggleSelectedMotion={handleToggleSelectedMotion}
            selectedLabel={selectedMotionTarget?.label}
          />
        </div>

        <div className="panel-section">
          <h2>レイヤー</h2>
          <div className="layer-grid">
            {Object.keys(activeLayers).map((layerId) => (
              <LayerToggle
                checked={activeLayers[layerId]}
                key={layerId}
                layerId={layerId}
                onChange={handleLayerToggle}
              />
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h2>選択中</h2>
          <SelectedInvestigationPanel
            analysisCorridor={selectedAnalysisCorridor}
            analysisNode={selectedAnalysisNode}
            border={selectedBorder}
            country={selectedCountry}
            flow={selectedFlow}
            frameworkMap={frameworkMap}
            globalFlow={selectedGlobalFlow}
            region={selectedRegion}
            regionMap={regionMap}
          />
        </div>

        <div className="panel-section">
          <h2>検証キュー</h2>
          <VerificationQueue
            items={verificationItems}
            onSelectItem={handleSelectVerificationItem}
          />
        </div>

        <div className="panel-section">
          <h2>国・国境</h2>
          <CountryList
            countries={sortedCountries}
            onSelectCountry={handleSelectCountry}
            selectedCountryId={selectedCountryId}
          />
          <h2 className="subsection-title">国境回廊</h2>
          <BorderList
            borders={sortedBorders}
            onSelectBorder={handleSelectBorder}
            selectedBorderId={selectedBorderId}
          />
        </div>

        <div className="panel-section">
          <h2>世界接続</h2>
          <GlobalFlowList
            flows={filteredGlobalFlows}
            onSelectFlow={handleSelectGlobalFlow}
            selectedGlobalFlowId={selectedGlobalFlowId}
          />
          <h2 className="subsection-title">接続先</h2>
          <EndpointList endpoints={filteredEndpointCountries} />
        </div>

        <div className="panel-section">
          <h2>分析オーバーレイ</h2>
          <AnalysisOverlayList
            corridors={filteredAnalysisCorridors}
            nodes={filteredAnalysisNodes}
            onSelectCorridor={handleSelectAnalysisCorridor}
            onSelectNode={handleSelectAnalysisNode}
            selectedAnalysisId={selectedAnalysisId}
          />
          <h2 className="subsection-title">方法論・凡例</h2>
          <FrameworkList
            analysisNodeMap={analysisNodeMap}
            frameworks={filteredFrameworks}
            regionMap={regionMap}
          />
        </div>

        <div className="panel-section">
          <h2>接続</h2>
          <FlowList
            flows={filteredFlows}
            onSelectFlow={handleSelectFlow}
            regionMap={regionMap}
            selectedFlowId={selectedFlowId}
          />
        </div>

        <div className="panel-section">
          <h2>時系列</h2>
          <div className="segmented-control" role="group" aria-label="年で絞り込み">
            {yearOptions.map((year) => (
              <button
                aria-pressed={yearFilter === year}
                className={yearFilter === year ? "active" : ""}
                key={year}
                onClick={() => setYearFilter(year)}
                type="button"
              >
                {year}
              </button>
            ))}
          </div>
          <EventList
            filteredEvents={filteredEvents}
            onSelect={handleSelectRegion}
            regionMap={regionMap}
          />
        </div>

        <div className="panel-section">
          <h2>確認度</h2>
          <div className="confidence-legend">
            {Object.entries(CONFIDENCE_META).map(([key, meta]) => (
              <p key={key}>
                <ConfidenceBadge value={key} />
                <span>{meta.detail}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h2>地域カード</h2>
          <div className="region-list">
            {sortedRegions.map((region) => (
              <RegionCard
                frameworkMap={frameworkMap}
                key={region.id}
                onSelect={handleSelectRegion}
                region={region}
                selected={region.id === selectedRegionId}
              />
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

export default App;
