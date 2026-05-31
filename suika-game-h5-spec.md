# Suika Game H5 — Bản Đặc Tả Kỹ Thuật Cho Coding Agent

> Tài liệu này dùng để giao cho coding agent (Claude Code / Cursor / v.v.) build một game **Suika (Watermelon Merge)** trên nền HTML5, tối ưu cho **giữ chân người chơi** và **kiếm tiền qua quảng cáo**.

---

## 1. Tổng quan dự án

| Hạng mục | Mô tả |
|---|---|
| Tên game | Suika / Watermelon Merge |
| Nền tảng | HTML5 (web + mobile web) |
| Mục tiêu | Kiếm tiền qua ads (rewarded + interstitial + banner) |
| Phong cách | Casual, "juicy", gây nghiện, đồ họa đẹp chuyên nghiệp |
| Định hướng màn hình | Portrait (dọc), tối ưu mobile trước |
| Thời gian build mục tiêu | ~1 tuần (bản trung bình) |

---

## 2. Gameplay cốt lõi

- Người chơi thả các quả từ trên xuống vào một hộp chứa.
- Hai quả **cùng loại** chạm nhau sẽ **gộp (merge)** thành quả lớn hơn một cấp.
- Chuỗi cấp quả (nhỏ → lớn), ví dụ: Cherry → Strawberry → Grape → ... → Watermelon.
- Có **preview quả tiếp theo**.
- **Thua** khi quả tràn qua vạch giới hạn trên cùng và giữ quá thời gian cho phép.
- Điểm tăng khi merge; quả càng lớn điểm càng cao; có **combo** khi merge liên tiếp.

---

## 3. Stack công nghệ bắt buộc

| Hạng mục | Thư viện | Ghi chú |
|---|---|---|
| Vật lý | **Matter.js** | Lõi physics cho va chạm & merge |
| Render | **PixiJS** | WebGL, hiệu năng cao, làm effect đẹp |
| Animation | **GSAP** | Tween mượt: pop, squash & stretch |
| Particle | **@pixi/particle-emitter** | Hiệu ứng tóe sáng / confetti khi merge |
| Filter | **@pixi/filters** (glow, bloom) | Quả phát sáng khi sắp gộp |
| Âm thanh | **Howler.js** | SFX + nhạc nền, đổi pitch theo cấp |
| Ads | AdSense for Games / GameDistribution SDK / CrazyGames SDK | Cắm sẵn hook, để placeholder nếu chưa có account |

> Kiến trúc: **Matter.js (vật lý) + PixiJS (hiển thị)** — tách biệt logic vật lý và render.
> Nếu cần build nhanh gọn hơn, có thể thay bằng **Phaser 3** (đã tích hợp Matter.js sẵn), nhưng ưu tiên Matter.js + PixiJS để effect cao cấp.

---

## 4. Yêu cầu "Game Juice" (làm game cực cuốn)

Đây là phần tạo khác biệt giữa game tầm thường và game gây nghiện. **Bắt buộc** triển khai:

### 4.1 Hiệu ứng hình ảnh
- **Particle khi merge:** tóe sáng / confetti màu theo loại quả.
- **Screen shake:** rung màn hình nhẹ khi gộp; biên độ tỉ lệ với độ lớn quả gộp.
- **Squash & stretch:** quả méo nhẹ khi va chạm rồi đàn hồi lại.
- **Pop animation:** quả mới merge phóng to nhanh rồi co về kích thước chuẩn (GSAP easing `back.out`).
- **Glow / Bloom:** quả phát sáng khi 2 quả cùng loại sắp chạm nhau.
- **Number popup:** điểm bay lên (+10, +50...) kèm scale + fade.
- **Trajectory line:** đường mờ chỉ vị trí quả sẽ rơi (khi người chơi giữ/ngắm).

### 4.2 Âm thanh (rất quan trọng — 50% độ gây nghiện)
- Mỗi lần merge **tăng pitch (cao độ) dần theo cấp quả** → tạo chuỗi "đô-rê-mi" thỏa mãn.
- SFX riêng cho: thả quả, gộp, combo, phá kỷ lục, game over.
- Nhạc nền nhẹ, có thể bật/tắt.

### 4.3 Phản hồi & cảm giác
- **Phản hồi tức thì** mọi hành động (chạm, rơi, gộp đều có feedback).
- **Anticipation:** quả lắc/nảy nhẹ trước khi thả.
- **Combo system:** merge liên tiếp trong khoảng thời gian ngắn → bonus điểm + hiệu ứng to dần.
- **Haptic feedback:** rung trên mobile khi merge — `navigator.vibrate()`.

---

## 5. Flow & các màn hình (bắt buộc đầy đủ)

```
Splash/Loading
      |
[Lần đầu?] --> Onboarding/Tutorial tương tác
      |
   Main Menu  <---------------------+
      | (Play)                      |
   Gameplay  <==>  Pause            |
      | (thua)                      |
   Game Over                        |
   |-- Hồi sinh (Rewarded Ad) --> về Gameplay
   |-- Replay (Interstitial Ad) --> Gameplay
   +-- Menu --------------------------+
```

### 5.1 Splash / Loading Screen
- Logo studio + thanh tiến trình tải asset.
- **Preload toàn bộ** ảnh/âm thanh tại đây để gameplay không giật.

### 5.2 Onboarding / Tutorial (chỉ lần đầu)
- Không có text dài. Tutorial **tương tác**, ngón tay animation chỉ "kéo → thả" trong gameplay thật.
- 1–2 bước, có nút **Skip**.
- Nguyên tắc: cho người chơi **chạm vào game trong 5 giây đầu**.

### 5.3 Main Menu
Thành phần:
- Nút **PLAY** to, nổi bật, animation pulse (nhịp thở).
- **High Score** hiển thị ngay.
- Nút **Settings** (nhạc / SFX / rung).
- Nút **Shop / Skins** (tùy chọn).
- **Daily Reward** (phần thưởng đăng nhập hằng ngày — tăng retention).
- Nút **Leaderboard**, **Share**, **âm thanh on/off**.

### 5.4 Gameplay Screen
- HUD gọn: điểm hiện tại, **preview quả tiếp theo**, nút **Pause**.
- Vạch giới hạn "thua" trên cùng, đổi màu / nhấp nháy khi quả gần chạm.

### 5.5 Pause Screen
- Resume / Restart / Về Menu / Settings.

### 5.6 Game Over Screen (màn hình kiếm tiền chính)
- Điểm vừa đạt + so sánh high score.
- Hiệu ứng **"New Record!"** nếu phá kỷ lục.
- Nút **"Hồi sinh — Xem quảng cáo"** (Rewarded Ad) — nơi ra tiền nhiều nhất.
- Nút **Replay** to (cắm Interstitial Ad theo tần suất).
- Nút **Share** / **Về Menu**.

### 5.7 Shop / Skins (tùy chọn — tăng doanh thu)
- Đổi skin quả, theme nền.
- Mua bằng coin (kiếm coin qua xem ads) hoặc IAP.

---

## 6. Chiến lược kiếm tiền (cắm sẵn hook trong code)

- **Interstitial:** hiện sau mỗi 2–3 lần game over (không spam để tránh mất người chơi).
- **Rewarded video:** tự nguyện — "Xem quảng cáo để +1 lượt / x2 điểm / hồi sinh". eCPM cao nhất.
- **Banner:** dưới cùng màn hình menu/game over, thu nhẹ nhưng ổn định.

> Yêu cầu code: tạo một **module ads abstraction** (ví dụ `AdManager`) với các hàm `showInterstitial()`, `showRewarded(onReward)`, `showBanner()`, `hideBanner()`. Ban đầu để **placeholder/mock** (log ra console + callback giả lập thành công) để dễ test, sau đó cắm SDK thật.

---

## 7. Yêu cầu kỹ thuật & chất lượng code

- **Responsive:** scale theo kích thước màn hình, ưu tiên portrait mobile; xử lý cả desktop.
- **Quản lý state màn hình:** dùng một **Scene/State Manager** rõ ràng (Splash → Menu → Game → GameOver...).
- **Tách module:** physics, render, audio, ads, UI tách riêng, dễ bảo trì.
- **Lưu dữ liệu cục bộ:** high score, settings, daily reward, skins đã mở — lưu bằng `localStorage`.
- **Hiệu năng:** giữ 60 FPS trên mobile tầm trung; object pooling cho particle nếu cần.
- **Asset:** nếu chưa có asset thật, dùng placeholder (vòng tròn gradient + màu theo cấp) nhưng cấu trúc code phải cho phép thay asset dễ dàng.
- **Cấu trúc thư mục** gợi ý:
  ```
  /src
    /scenes      (Splash, Menu, Game, GameOver, Pause)
    /entities    (Fruit, FruitFactory)
    /systems     (PhysicsSystem, MergeSystem, ScoreSystem, ComboSystem)
    /managers    (AudioManager, AdManager, SaveManager, SceneManager)
    /effects     (Particles, ScreenShake, Popups)
    /ui          (Buttons, HUD, Modals)
    /config      (fruits config, constants)
  /assets
    /images /audio /fonts
  index.html
  ```

---

## 8. Cấu hình chuỗi quả (ví dụ — agent có thể điều chỉnh)

| Cấp | Tên | Bán kính (px) | Điểm khi tạo | Màu placeholder |
|---|---|---|---|---|
| 1 | Cherry | 20 | 1 | đỏ |
| 2 | Strawberry | 28 | 3 | hồng |
| 3 | Grape | 36 | 6 | tím |
| 4 | Dekopon | 46 | 10 | cam nhạt |
| 5 | Orange | 58 | 15 | cam |
| 6 | Apple | 72 | 21 | đỏ tươi |
| 7 | Pear | 88 | 28 | vàng xanh |
| 8 | Peach | 106 | 36 | hồng đào |
| 9 | Pineapple | 126 | 45 | vàng |
| 10 | Melon | 148 | 55 | xanh lá |
| 11 | Watermelon | 172 | 66 | xanh đậm |

> Quả mới thả ngẫu nhiên trong 4–5 cấp nhỏ nhất.

---

## 9. Tiêu chí hoàn thành (Definition of Done)

- [ ] Vật lý merge hoạt động mượt, không kẹt/chồng quả lỗi.
- [ ] Đủ effect: particle, screen shake, squash & stretch, pop, glow, number popup.
- [ ] Âm thanh đầy đủ + pitch tăng dần theo cấp.
- [ ] Đủ flow màn hình: Splash → (Onboarding) → Menu → Game → Pause → Game Over.
- [ ] Combo system + haptic feedback hoạt động.
- [ ] `AdManager` với hook rewarded/interstitial/banner (mock được).
- [ ] Lưu high score & settings bằng localStorage.
- [ ] Responsive portrait mobile + chạy được desktop, ~60 FPS.
- [ ] Code tách module, dễ thay asset & cắm SDK ads thật.

---

## 10. Gợi ý nguồn asset (miễn phí)

- **Kenney.nl** — UI, SFX miễn phí.
- **itch.io** — asset game miễn phí/giá rẻ.
- Có thể dùng AI tạo hình quả/icon riêng cho phong cách đồng nhất.

---

**Yêu cầu agent:** Hãy build game theo đặc tả trên bằng **Matter.js + PixiJS + GSAP + Howler.js**, ưu tiên trải nghiệm "juicy" và đầy đủ flow màn hình. Bắt đầu bằng cấu trúc dự án + gameplay core, sau đó thêm effect, âm thanh, rồi UI/flow màn hình và cuối cùng là module ads (mock).
