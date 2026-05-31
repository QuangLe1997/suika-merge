# Suika Game H5 — Hệ Thống Trò Chơi (Game Systems & Progression)

> Tài liệu bổ sung cho `suika-game-h5-spec.md`. File này đặc tả **chiều sâu gameplay**: độ khó, chế độ chơi, hệ thống trợ giúp (power-up/booster), nhiệm vụ, và các vòng lặp giữ chân. Mục tiêu: biến Suika từ "game chơi cho vui" thành game **có chiều sâu, giữ chân lâu, kiếm tiền bền vững**.

---

## 1. Hệ thống độ khó (Difficulty)

Suika cổ điển vốn "tự tăng khó" theo độ đầy của hộp. Nhưng để có chiều sâu, bổ sung thêm các tầng độ khó:

### 1.1 Độ khó động (tự động trong 1 ván)
- Hộp càng đầy → áp lực càng cao (cơ chế gốc, giữ nguyên).
- **Tốc độ xuất quả to** tăng dần theo thời gian/điểm: càng chơi lâu, tỉ lệ ra quả cấp cao hơn tăng nhẹ (tránh ván kéo dài vô tận).

### 1.2 Cấp độ khó người chơi chọn (Game difficulty modes)
| Mode | Mô tả | Khác biệt |
|---|---|---|
| **Easy / Relax** | Hộp rộng hơn, thời gian "tràn vạch" trước khi thua dài hơn | Cho người mới, người chơi giải trí |
| **Normal** | Cân bằng chuẩn (mặc định) | Trải nghiệm Suika gốc |
| **Hard / Challenge** | Hộp hẹp hơn, ít thời gian ân hạn, quả to xuất hiện sớm | Cho người chơi cứng tay, leaderboard |

> Lưu lựa chọn mode bằng `localStorage`. Leaderboard nên tách theo mode để công bằng.

### 1.3 Đường cong độ khó (Difficulty curve)
- 0–60 giây đầu: dễ thở, để người chơi "vào nhịp" và đạt vài combo đầu (cảm giác giỏi).
- Sau đó: tăng dần áp lực qua tỉ lệ quả + tốc độ.
- Tránh "spike" độ khó đột ngột — người chơi casual sẽ bỏ.

---

## 2. Các chế độ chơi (Game Modes)

Một game hoàn chỉnh nên có nhiều hơn 1 cách chơi để tăng tuổi thọ:

### 2.1 Classic (chế độ chính)
- Suika gốc: merge tới quả lớn nhất (Watermelon), chơi tới khi tràn vạch.
- Mục tiêu: điểm cao nhất.

### 2.2 Time Attack
- Giới hạn thời gian (vd 2–3 phút), ghi điểm cao nhất trong thời gian đó.
- Nhịp nhanh, phù hợp xem ads giữa các lượt ngắn.

### 2.3 Challenge / Daily Challenge ⭐
- Mỗi ngày một thử thách cố định (cùng seed cho mọi người): "Đạt X điểm", "Tạo Y quả Watermelon", "Merge Z lần trong 60s".
- **Retention cực mạnh** — lý do để người chơi quay lại mỗi ngày.
- Có thể gắn phần thưởng (coin/skin) khi hoàn thành.

### 2.4 Zen / Endless (tùy chọn)
- Không thua, không áp lực — chỉ thư giãn merge. Thu hút nhóm người chơi giải trí, giữ chân nhóm casual nhẹ.

> Ưu tiên build: **Classic** trước → **Daily Challenge** → **Time Attack** → Zen (nếu còn thời gian).

---

## 3. Hệ thống trợ giúp (Power-ups / Boosters)

Đây vừa là chiều sâu gameplay, vừa là **nguồn kiếm tiền** (mua bằng coin / xem ads / IAP).

### 3.1 Booster trong ván (in-game)
| Booster | Tác dụng | Cách nhận |
|---|---|---|
| **Búa / Hammer** | Xóa 1 quả bất kỳ do người chơi chọn | Coin / Rewarded Ad |
| **Đổi quả / Swap** | Đổi quả hiện tại sang quả khác | Coin |
| **Bom / Bomb** | Nổ xóa vùng quanh điểm thả | Coin / IAP |
| **Đóng băng / Freeze** | Tạm dừng "đồng hồ tràn vạch" vài giây | Rewarded Ad |
| **Magnet** | Hút 2 quả cùng loại lại gần để merge | Coin |

- Mỗi ván nên có **giới hạn số lần dùng** (tránh phá cân bằng).
- UI: hàng nút booster ở cạnh dưới màn gameplay, hiển thị số lượng còn lại.

### 3.2 Trợ giúp khi thua (Revive)
- **Hồi sinh:** khi tràn vạch, cho phép xóa vài quả trên cùng để chơi tiếp.
- Nhận bằng **Rewarded Ad** (lần 1 miễn phí mỗi ván) hoặc coin/IAP (các lần sau, giá tăng dần).
- Giới hạn số lần hồi sinh/ván để tránh ván vô tận.

### 3.3 Trợ giúp định hướng (gameplay aids)
- **Next preview:** hiện quả tiếp theo (cơ bản, bật mặc định).
- **Trajectory line:** đường ngắm vị trí rơi — có thể là tính năng mở khóa hoặc bật/tắt trong settings.
- **Merge hint:** highlight nhẹ 2 quả cùng loại đang gần nhau (cho Easy mode).

---

## 4. Hệ thống tiền tệ & phần thưởng (Economy)

- **Coin:** tiền mềm, dùng mua booster/skin. Nhận qua: chơi (mỗi ván), daily reward, xem ads, hoàn thành nhiệm vụ.
- **Gem / IAP (tùy chọn):** tiền cứng, mua trực tiếp hoặc nhận hạn chế — dùng cho skin hiếm, gói booster.
- **Cân bằng:** đảm bảo người chơi *không tiêu tiền vẫn chơi vui*, nhưng tiêu tiền/xem ads thì tiện hơn (mô hình free-to-play lành mạnh).

---

## 5. Nhiệm vụ & mục tiêu (Quests / Missions)

Tạo "lý do để chơi tiếp" ngoài điểm số:

### 5.1 Daily Quests (làm mới mỗi ngày)
- Ví dụ: "Merge 50 lần", "Tạo 1 quả Pineapple", "Chơi 3 ván", "Đạt 1000 điểm".
- Hoàn thành → coin / tiến độ phần thưởng.

### 5.2 Achievements (thành tựu dài hạn)
- "Tạo quả Watermelon đầu tiên", "Đạt 5000 điểm", "Combo x5", "Chơi 100 ván".
- Mở khóa skin / huy hiệu khoe.

### 5.3 Daily Reward (chuỗi đăng nhập)
- Phần thưởng tăng dần theo ngày liên tiếp (Day 1 → Day 7 → reset hoặc vòng lặp).
- Ngày thứ 7 thưởng lớn (skin/booster) để tạo động lực giữ chuỗi.

---

## 6. Tiến trình & mở khóa (Progression & Unlocks)

- **Skins quả:** bộ chủ đề (trái cây, hành tinh, emoji, thú cưng...). Đổi toàn bộ chuỗi quả.
- **Themes nền:** đổi nền + nhạc + hiệu ứng hạt.
- Mở khóa bằng: coin, đạt thành tựu, hoàn thành Daily Challenge, hoặc IAP.
- **Level / Rank người chơi (tùy chọn):** tích XP qua mỗi ván → lên cấp → mở thưởng. Tạo cảm giác tiến bộ dài hạn.

---

## 7. Leaderboard & yếu tố xã hội

- **Bảng xếp hạng:** theo từng mode (Classic / Time Attack / Daily Challenge).
- Lưu cục bộ (localStorage) cho bản đơn giản; có thể nâng cấp server/online sau.
- **Share:** chia sẻ điểm/kỷ lục kèm ảnh — kênh marketing miễn phí (viral).

---

## 8. Vòng lặp giữ chân (Retention loops) — tóm tắt

```
Daily Reward (đăng nhập)  -->  Daily Quest + Daily Challenge (mục tiêu hôm nay)
        ^                                   |
        |                                   v
   Quay lại hôm sau   <--  Nhận coin/skin  <--  Chơi ván + dùng booster
                                            |
                                            v
                          Xem ads (hồi sinh / x2 / nhận coin)  --> Doanh thu
```

---

## 9. Tích hợp với hệ thống ads (liên kết file spec chính)

- **Rewarded:** hồi sinh, x2 coin cuối ván, nhận booster miễn phí, đóng băng.
- **Interstitial:** sau mỗi 2–3 ván (đặc biệt phù hợp Time Attack vì ván ngắn).
- **Booster IAP:** gói combo booster, gói bỏ quảng cáo (remove ads) — nguồn doanh thu ổn định.

> Mọi điểm chạm ads/economy nên đi qua `AdManager` và một `EconomyManager` (mock được khi chưa cắm SDK/IAP thật).

---

## 10. Ưu tiên triển khai (đề xuất thứ tự cho agent)

1. **Classic mode** + độ khó động cơ bản (đã có ở spec chính).
2. **3 difficulty modes** (Easy/Normal/Hard) + lưu lựa chọn.
3. **Revive bằng Rewarded Ad** + **2–3 booster cốt lõi** (Hammer, Bomb, Freeze).
4. **Economy (coin)** + **Daily Reward**.
5. **Daily Quests** + **Daily Challenge**.
6. **Skins/Themes** + mở khóa.
7. **Achievements**, **Leaderboard**, **XP/Rank**, các mode phụ (Time Attack, Zen).

---

## 11. Definition of Done (hệ thống game)

- [ ] 3 difficulty modes hoạt động, lưu lựa chọn.
- [ ] Ít nhất 3 booster trong ván + giới hạn lượt dùng.
- [ ] Revive bằng Rewarded Ad (giới hạn lượt/ván).
- [ ] Economy coin: kiếm + tiêu, lưu localStorage.
- [ ] Daily Reward (chuỗi 7 ngày) hoạt động.
- [ ] Daily Quests + ít nhất 1 Daily Challenge.
- [ ] Ít nhất 2 bộ skin + cơ chế mở khóa.
- [ ] Leaderboard cục bộ theo mode + nút Share.
- [ ] Mọi hook ads/economy đi qua manager, mock được.
