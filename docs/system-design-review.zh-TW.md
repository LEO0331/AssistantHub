# AssistantHub 系統設計審查（繁體中文）

## 1. 範圍與目標
本審查聚焦於 AssistantHub 目前的前端單頁架構（React SPA），重點包含：
- 系統架構與模組邊界
- 設計取捨與理由
- 資料結構選型與替代方案
- 深度技術問答準備

## 2. 高階架構
AssistantHub 是一個不依賴後端的前端單頁應用。

### 分層視角
- 呈現層：`App.js`、`ProfileCards.js`、`SearchBar.js`、`ContactModal.js`、CSS
- UI 狀態層：`useReducer(uiReducer)` + 區域 `useState`
- 持久化層：`usePersistentState`（以 localStorage 為基礎）
- 領域/資料層：`assistantFactory` + `talentAdapter`
- 工具層：debounce、驗證、設計常數

### 執行流程
1. 使用者調整控制項（人數、篩選、來源、seed）。
2. `loadTalentPool` 生成或載入可重現的模擬資料。
3. App 計算衍生視圖（`searchIndex`、`matchedSearchIds`、過濾/排序/分頁）。
4. UI 呈現卡片模式或虛擬化表格模式。
5. 使用者操作（shortlist、狀態流轉、匯入/匯出）更新記憶體狀態與 localStorage。

## 3. 元件與模組邊界

### 核心容器（`App.js`）
職責：
- 統籌狀態與 side effects
- 載入資料
- 計算衍生資料
- 管理 modal/drawer 與頂層互動

取捨：
- 優點：對 demo 產品開發與除錯速度快。
- 缺點：檔案偏大，協調邏輯與部分業務邏輯耦合，功能成長後維護風險增加。

### 資料生成（`src/data/assistantFactory.js`）
職責：
- 使用 seed faker 產生可重現的人才資料
- 控制角色/技能/語言分布

取捨：
- 優點：demo 可重現、測試穩定。
- 缺點：與真實後端資料行為相比仍有落差。

### 來源轉接（`src/services/talentAdapter.js`）
職責：
- 抽象資料來源（`local`、`mock-api`）
- 模擬非同步延遲，為未來後端遷移做準備

取捨：
- 優點：替換成真實 API 的接點清楚。
- 缺點：目前仍偏前端本地耦合，尚未建立重試/錯誤分類模型。

### UI reducer（`src/state/uiReducer.js`）
職責：
- 集中處理篩選/排序/modal/drawer/loading 等 UI 狀態轉移

取捨：
- 優點：狀態轉移可讀、可測。
- 缺點：action type 以字串表示，少了編譯期保護。

## 4. 資料結構選型：為何這樣選、替代方案是什麼

### A. `assistants` 使用 `Array<Assistant>`
選擇理由：
- 列表渲染、篩選、排序、分頁、虛擬化本質上是順序操作
- 保留顯示順序，切片分頁簡單

替代方案：
- `Map<id, Assistant>`（O(1) 查找）
- 混合正規化：`{ byId: Map, allIds: string[] }`

目前不採用替代方案原因：
- 現階段多數操作是整體列表轉換，不是隨機 id 查找
- 規模（<= 5000）對陣列仍可接受

何時該切換：
- 當 id 型讀寫明顯增加，可改為正規化結構

### B. `matchedSearchIds` 使用 `Set<string>`
選擇理由：
- 過濾階段 membership 檢查為 O(1)
- 避免每輪過濾重複做字串搜尋

替代方案：
- id 陣列 + `.includes`（membership 為 O(n)）
- trie / 倒排索引

目前不採用替代方案原因：
- `.includes` 在結果集變大時效能較差
- trie/索引複雜度對目前需求過高

### C. Shortlist 使用陣列
選擇理由：
- 便於保持顯示順序、彈窗展示與匯出
- JSON 序列化與匯入匯出流程簡單

替代方案：
- `Map<id, ShortlistedTalent>`
- `Set<id>` + 明細 map

目前不採用替代方案原因：
- shortlist 通常規模不大
- 目前 UX 以直觀匯入匯出為優先

可行優化：
- 保持陣列為主資料，同步建立記憶體索引（map/set）加速查詢

### D. UI 狀態採 reducer 物件
選擇理由：
- 多個互相關聯的 UI 狀態透過 action 轉移更清楚
- 避免狀態更新邏輯分散

替代方案：
- 全部使用獨立 `useState`
- 外部狀態庫（Redux、Zustand、Jotai）

目前不採用替代方案原因：
- 全 `useState` 在交互增長後可讀性快速下降
- 狀態庫對單頁 demo 的導入成本偏高

### E. source adapter 採 key-value 物件映射
選擇理由：
- 依 source key 直接派發
- 新來源擴充成本低

替代方案：
- `switch/case`
- class-based strategy

目前不採用替代方案原因：
- 現有來源數量少，物件映射最精簡可讀

### F. 虛擬化表格採 index 計算 + slice
選擇理由：
- 渲染視窗範圍可控
- 不增加額外依賴

替代方案：
- `react-window` / `react-virtualized`

目前不採用替代方案原因：
- 目前自製方案已足夠，且可避免新依賴複雜度

## 5. 架構取捨總結

### 優勢
- demo 行為可重現、可驗證
- 資料生成與來源轉接邊界清楚
- 大列表顯示策略完整（分頁 + 虛擬化）
- shortlist 與 seed 具本地持久化能力

### 弱點 / 風險
- `App.js` 體積大，擴充後審查與維護成本上升
- 全前端本地資料，不具多使用者一致性或審計能力
- 無後端契約驗證（僅前端 schema guard）
- reducer action 字串有 typo 風險

### 未來演進方向
- 將 `App.js` 拆分為 feature hooks（如 `useTalentPool`、`useShortlistFlow`、`useDemoImportExport`）
- 若 id 型操作增長，改用正規化資料結構
- adapter 接入真實 API，補齊錯誤處理/重試/取消機制
- 導入 TypeScript 或更強 schema 層提升契約可靠性

## 6. Deep Dive 問題準備（含建議答法）

### Q1. 為何搜尋要 debounce，而不是每次 keypress 立即過濾？
建議答法：
- Debounce 可降低大列表（最多 5000）下的重算與重繪壓力，在可接受延遲下提升操作流暢性。

### Q2. 為何資料生成要用 seed 做 deterministic？
建議答法：
- 可重現讓 demo、測試與除錯穩定；同一 seed + count 必然重建同一批資料。

### Q3. 為何 UI 用 reducer，但 domain state 不完全 reducer 化？
建議答法：
- UI 轉移是有限狀態事件流，適合 reducer；domain 清單目前以局部更新與 memo 衍生即可，複雜度更低。

### Q4. 為何 shortlist 用陣列，明明 membership 會重複查？
建議答法：
- 先優先簡單序列化與展示；shortlist 通常小。若規模增大，可加入輔助 map/set。

### Q5. 為何現在不導入 Redux/Zustand？
建議答法：
- 目前規模用 React 內建 primitives 已足夠且更輕量；當跨頁協調、共享快取與複雜 async 流程成長時，外部狀態庫才更有價值。

### Q6. 轉真實後端的路徑是什麼？
建議答法：
- 先替換 `mock-api` adapter 實作，保持 `loadTalentPool` 介面不變，再逐步把 shortlist/inquiry 寫入後端，降低 UI 衝擊。

### Q7. 匯入流程目前有哪些正確性防護？
建議答法：
- 檔案型別/大小檢查、頂層 schema 檢查、欄位正規化、數值清洗、文字長度限制，可避免異常 payload 破壞執行狀態。

### Q8. 現在的效能瓶頸會在哪？
建議答法：
- 主要在全列表反覆轉換與 render 期間多次 `.some()` membership 查詢。可用 memo 索引與正規化儲存再進一步優化。

## 7. 面試追問清單（可預先演練）
- 你如何保證排序邏輯在不同瀏覽器與重構後都穩定？
- 你如何量化「自製虛擬化」何時該換成成熟庫？
- 導入後端後，optimistic update 與衝突解決策略怎麼設計？
- 資料載入失敗時，你的 error budget 與 observability 設計是什麼？
- 若從 demo 走向 production，RBAC（角色權限）如何落地？

## 8. 結論
以目前「前端 demo + 可重現資料 + 中型列表」目標來看，架構是務實且可運作的。主要技術債不在於錯誤的資料結構，而是協調邏輯集中在 `App.js`，以及缺乏後端權威狀態。現有模組邊界（`talentAdapter`、reducer、hooks）已提供後續漸進式強化的良好基礎。
