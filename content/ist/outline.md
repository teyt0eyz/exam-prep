# IST — Outline (Step 1, รอ review)

สถานะ: **ร่างสำหรับตรวจ** ยังไม่ได้เขียนบทเรียน, simulation หรือข้อสอบ

- วิชา: Internetworking Standards and Technologies (มาตรฐานและเทคโนโลยีเครือข่าย)
- ผู้สอน (ตามสไลด์): ผศ.ดร.อรรถพล ป้อมสถิตย์
- อุปกรณ์/เครื่องมือที่ใช้สอน: Cisco IOS, Kali Linux (Wireshark, tcpdump, nmap, yersinia)
- อ่านครบทุกไฟล์ใน `docs/IST/` แล้ว: 8 ไฟล์ 267 หน้า (อ่าน text ทุกหน้า และดูภาพของหน้าที่เนื้อหาอยู่ในรูป เช่น คำสั่ง config, topology, ตาราง timer)

## 0. เรื่องที่ต้องให้ตัดสินใจก่อนเขียนบทเรียน

1. **ลำดับของไฟล์ที่ไม่มีเลขบท** — แผนที่หลักสูตรในสไลด์ (VLAN p.2) บอกว่า
   บทที่ 1 Switching & MAC → บทที่ 2 VLAN → บทที่ 3 STP → บทที่ 4 Inter-VLAN Routing → บทที่ 5+ Routing/WAN/Wireless
   สี่ไฟล์หลังไม่มีเลขบท ผมเรียงเป็น Inter-VLAN + FHRP → FHRP (ละเอียด) → OSPF → Advanced Routing & WAN
   ถ้าอาจารย์สอนลำดับอื่น บอกได้
2. **`chapter2 Switched Network.pdf` เป็นสไลด์ชุดเก่า** — ภาษาอังกฤษ 74 หน้า (ท้ายสไลด์เขียน "A.pomsathit SSRU")
   เนื้อหาซ้อนกับบทที่ 1–3 ชุดใหม่ (switching, VLAN, VTP, STP) ผมใช้เป็น **เอกสารเสริมของบทที่ 1–3** ไม่แยกเป็นบท
   ถ้าอาจารย์ใช้ไฟล์นี้เป็นบทที่ 2 จริง และ `Vlan.pdf` เป็นส่วนเพิ่ม บอกได้ จะสลับน้ำหนัก
3. **เนื้อหาที่น่าจะขาด**
   - **OSPF พื้นฐาน** — มีแต่ไฟล์ "OSPF (Single Area) ขั้นสูง" 12 หน้า (เลขสไลด์ระบุ x/15 จึงมีบางหน้าหาย)
     ไม่มีเรื่อง neighbor state, LSA type, Hello/Dead timer, static routing
   - **Wireless** — อยู่ในแผนที่หลักสูตร แต่ไม่มีไฟล์
   - **ACL** — มีเฉพาะตัวอย่าง Extended ACL ในบท Inter-VLAN ไม่มีบทแยก
   ผมจะไม่เขียนหัวข้อเหล่านี้จนกว่าจะมีไฟล์
4. **ไม่มีข้อมูลการสอบ** — ไม่มีเกณฑ์คะแนน, ขอบเขตกลางภาค/ปลายภาค หรือข้อสอบเก่า
   มีแต่คำถามท้ายบทแบบอธิบาย (บทที่ 1 สิบข้อ, Advanced Routing & WAN เก้าข้อ) ถ้ามี assignment หรือ lab sheet จะช่วยได้มาก
5. **`HTTP for Developer.pdf` ใน `docs/OOD/`** — ถ้าเป็นของวิชานี้ ย้ายมา `docs/IST/` แล้วบอกผม จะเพิ่มเข้า outline
6. **ชื่อโฟลเดอร์** — เอกสารอยู่ที่ `docs/IST/` รหัสวิชาในเว็บคือ `ist`

### ตัวย่อไฟล์ที่ใช้อ้างอิง

| ย่อ | ไฟล์ | หน้า | หัวเรื่องในสไลด์ |
|---|---|---|---|
| CH1 | `chapter1_lecture (2).pdf` | 36 | บทที่ 1: Switching Concepts, MAC Address Table และ Port Security เบื้องต้น |
| SWN | `chapter2 Switched Network.pdf` | 74 | Switched Network Overview (ชุดเก่า: switching, VLAN, VTP, STP) |
| VLAN | `Vlan.pdf` | 40 | บทที่ 2: VLAN — VTP, Native VLAN, Private VLAN, VLAN Hopping |
| STP | `Spanning Tree Protocol Presentation (1).pdf` | 28 | บทที่ 3: Spanning Tree Protocol |
| IVR | `มาตรฐานและเทคโนโลยีเครือข่าย (2).pdf` | 34 | Inter-VLAN Routing & Router Gateway Redundancy |
| FHRP | `Default Gateway คือจุดเปราะบางของเครือข่าย.pdf` | 23 | Gateway Redundancy — HSRP, VRRP, GLBP |
| OSPF | `OSPF_Single_Area_Advanced.pdf` | 12 | OSPF (Single Area) ขั้นสูง |
| WAN | `Advanced_Routing_WAN_Lecture_Lab.pdf` | 20 | Advanced Routing and WAN Technologies |

---

## 1. บทและหัวข้อตามลำดับที่สอน

### บทที่ 1: Switching Concepts, MAC Address Table, Port Security — CH1 (+ SWN)

**1.1 OSI Model และ Ethernet frame** (CH1 p.4–6; SWN p.2–3)
- Switch ทำงานที่ Layer 2 ใช้ MAC address · Router ทำงานที่ Layer 3 ใช้ IP address
- Ethernet frame: Preamble 7 byte, SFD 1, Dest MAC 6, Src MAC 6, Type/Len 2, Data 46–1500, FCS 4 (CRC)
- ความเร็วภายใต้ 802.3: 10BASE-T, 100BASE-TX, 1000BASE-T, 10GBASE-T, 100G/400G (พร้อมปีและสายที่ใช้)

**1.2 Hub, Bridge, Switch** (SWN p.10–15, 25–26)
- Hub: Layer 1, ทุกเครื่องแชร์ bandwidth, ส่งได้ทีละเครื่อง · Bridge: เรียนรู้ address, เชื่อมสอง segment
- Switch = multiport bridge ประสิทธิภาพสูง ทำงานด้วย hardware (ASIC)
- หน้าที่สามอย่างของ switch: address learning, forward/filter decision, loop avoidance
- Bridging (software, STP instance เดียว) กับ LAN switching (hardware, หลาย instance) · Full-duplex

**1.3 Switching method** (CH1 p.8–10; SWN p.23)
- Store-and-Forward: รับทั้ง frame, ตรวจ CRC — latency สูงสุดและแปรตามขนาด frame, ตรวจ error ครบ
- Cut-Through: ส่งทันทีหลังอ่าน Destination MAC (6 byte) — latency ต่ำสุดและคงที่, ไม่ตรวจ error
- Fragment-Free: รอ 64 byte แรกเพื่อกรอง collision fragment — อยู่กึ่งกลาง
- สถานการณ์: ห้อง trading → Cut-Through · Data center → Store-and-Forward · เครือข่ายทั่วไป → Fragment-Free

**1.4 MAC address และ MAC address table** (CH1 p.12–17; SWN p.17–22)
- MAC 48 bit: OUI 3 byte แรก (IEEE กำหนดให้ผู้ผลิต) + Device ID 3 byte หลัง
- กระบวนการ 4 ขั้น: **Learn** (Source MAC + พอร์ตขาเข้า) → **Flood** (ไม่รู้จักปลายทาง ส่งทุกพอร์ตยกเว้นขาเข้า) → **Forward** → **Age Out** (default 300 วินาที)
- Broadcast และ multicast ถูก flood เสมอ · ตาราง MAC เรียกอีกชื่อว่า CAM table
- คำสั่ง: `show mac address-table [dynamic|count]`, `clear mac address-table dynamic`, `mac address-table aging-time <sec>`, `mac address-table static ...`
- Aging time สั้นเกิน → flood/relearn บ่อย · ยาวเกิน → entry ค้าง
- Static MAC ใช้กับ server สำคัญ, อุปกรณ์ที่ต้องอยู่พอร์ตเดิม

**1.5 Collision domain กับ Broadcast domain** (CH1 p.19–20; SWN p.3–9, 27–29)
- แต่ละพอร์ตของ switch = 1 collision domain · ทุกพอร์ตใน VLAN เดียวกัน = 1 broadcast domain
- Layer 1 ไม่แบ่ง collision domain · Layer 2 และ 3 แบ่ง collision domain · Layer 1 และ 2 ไม่กัน broadcast (SWN p.9)
- Broadcast domain ใหญ่เกิน → broadcast storm → ต้องแบ่ง VLAN หรือใช้ router/L3 switch

**1.6 มาตรฐาน IEEE** (CH1 p.22–24)
- 802.3 Ethernet · 802.1Q VLAN tagging/trunking · 802.1X port-based network access control
- 802.1w RSTP · 802.1AX link aggregation (ปีตามสไลด์ p.24)

**1.7 ความเสี่ยง Layer 2** (CH1 p.26–27)
- **MAC flooding**: ส่ง frame ด้วย Source MAC ปลอมจำนวนมากจน CAM table เต็ม → switch เข้า fail-open, flood ทุก frame เหมือน hub → ดักฟังได้
- พรีวิว: VLAN hopping, BPDU/STP attack, ARP spoofing

**1.8 Port Security** (CH1 p.29–34)
- องค์ประกอบ: Maximum (default 1) · Learning: Static / Dynamic / **Sticky** · Violation mode
- Violation mode: **Protect** (ทิ้งเงียบ ไม่ log พอร์ตไม่ปิด), **Restrict** (ทิ้ง + log/SNMP พอร์ตไม่ปิด), **Shutdown** (default; พอร์ตเป็น err-disabled)
- config: `switchport mode access`, `switchport port-security`, `... maximum 2`, `... mac-address sticky`, `... violation restrict`
- กู้คืน err-disabled: `shutdown` / `no shutdown` หรือ `errdisable recovery cause psecure-violation` + `errdisable recovery interval 60`

### บทที่ 2: VLAN — VLAN (+ SWN)

**2.1 VLAN, Access port, Trunk port** (VLAN p.5–7; SWN p.30–44)
- VLAN = แบ่ง broadcast domain ระดับ logical · ต่าง VLAN ต้องผ่าน Layer 3
- ประโยชน์: ลด broadcast, เพิ่ม security, จัดกลุ่มตามแผนกโดยไม่ขึ้นกับตำแหน่ง, ย้าย/เพิ่ม/เปลี่ยนง่าย
- Access port: 1 VLAN, ต่อ end device, untagged · Trunk port: หลาย VLAN, ต่อ switch/router, tagged
- Trunking: ISL (Cisco) กับ IEEE 802.1Q
- 802.1Q tag 4 byte: TPID 16 bit (`0x8100`) + Priority/PCP 3 bit + CFI/DEI 1 bit + VLAN ID 12 bit (ใช้ได้ 1–4094) (VLAN p.7; IVR p.4)

**2.2 VTP** (VLAN p.9–18; SWN p.45–49)
- โพรโทคอลของ Cisco กระจาย VLAN database ผ่าน trunk ภายในโดเมนเดียวกัน
- Mode: **Server** (สร้าง/แก้ได้, รับได้, ส่งต่อได้; default), **Client** (สร้างไม่ได้, รับได้, ส่งต่อ), **Transparent** (สร้างได้เฉพาะตัวเอง, ไม่รับ, ส่งต่ออย่างเดียว)
- config: `vtp mode server`, `vtp domain LABCORP`, `vtp password vtp123`, `vtp version 2` · domain และ password ต้องตรงกัน
- **Revision number**: เพิ่มทุกครั้งที่ VLAN database เปลี่ยน · switch เชื่อค่าที่สูงกว่าเสมอ ไม่ว่า server หรือ client
  → switch เก่าที่ revision สูงกว่าเขียนทับทั้งโดเมนได้ · ป้องกัน: เปลี่ยนชื่อ domain ชั่วคราว (reset เป็น 0), ใช้ Transparent, ตรวจ `show vtp status` ก่อนต่อ
- Version 1 / 2 / 3 · VTP pruning (`vtp pruning`) · Authentication ด้วย MD5 digest
- Advertisement ส่งเป็น multicast ทุก 5 นาทีหรือเมื่อมีการเปลี่ยนแปลง (SWN p.47)

**2.3 Native VLAN** (VLAN p.20–22; IVR p.7)
- VLAN บน trunk ที่ไม่ใส่ tag · default คือ VLAN 1 · มีไว้เพื่อ backward compatibility และ control traffic (CDP, PAgP, DTP)
- Mismatch: สองฝั่งตั้งไม่ตรงกัน → traffic รั่วข้าม VLAN · ตรวจด้วย `show cdp neighbors detail`
- Best practice: `switchport trunk native vlan 999` ทั้งสองฝั่ง

**2.4 Private VLAN** (VLAN p.24–27)
- แบ่ง Primary VLAN เป็น Secondary VLAN เพื่อจำกัดการคุยกันระหว่างพอร์ตใน subnet เดียวกัน
- พอร์ต: **Promiscuous** (คุยได้ทุกพอร์ต; ต่อ gateway), **Isolated** (คุยได้แต่ promiscuous), **Community** (คุยกับ promiscuous และ community เดียวกัน)
- ทุก secondary VLAN ใช้ IP subnet เดียวกับ primary (แยกที่ Layer 2 เท่านั้น)
- config: `private-vlan primary|isolated|community`, `private-vlan association`, `switchport mode private-vlan promiscuous|host`

**2.5 ติดตั้งหลาย switch** (VLAN p.29–30)
- Topology Lab Corp: SW1 server, SW2/SW3 client; Sales 10, IT 20, HR 30, Native 999
- ลำดับ: Basic → VTP → Trunk/Native → VLAN → Access/PVLAN → Verify
- คำสั่งตรวจสอบ: `show vlan brief`, `show vtp status`, `show interfaces trunk`, `show interfaces status`

**2.6 VLAN Hopping** (VLAN p.32–39; IVR p.7)
- **Switch spoofing**: ผู้โจมตีเจรจา DTP ให้พอร์ตกลายเป็น trunk (เมื่อพอร์ตยังเป็น Dynamic Auto/Desirable)
- **Double tagging**: outer tag = Native VLAN (ถูกลอกที่ switch ตัวแรก), inner tag = VLAN เป้าหมาย · ทำงานได้ทิศทางเดียว
- เครื่องมือ: `yersinia` บน Kali
- ป้องกัน: `switchport mode access` + `switchport nonegotiate`, เปลี่ยน Native VLAN เป็น VLAN ที่ไม่ใช้, `switchport trunk allowed vlan remove 999`

### บทที่ 3: Spanning Tree Protocol — STP (+ SWN)

**3.1 ปัญหา Layer 2 loop** (STP p.3–7; SWN p.55–64)
- ลิงก์สำรองให้ fault tolerance แต่ทำให้เกิด physical loop · frame ระดับ Layer 2 **ไม่มี TTL** จึงวนไม่สิ้นสุด
- ผลกระทบ: **Broadcast storm**, **MAC address table instability** (MAC flapping), **Multiple frame copies**

**3.2 STP และตระกูล** (STP p.9–10)
- IEEE 802.1D: บล็อกพอร์ตทาง logical ไม่ต้องถอดสาย เปิดกลับเมื่อสายหลักล่ม
- STP 802.1D (~50 วินาที) · RSTP 802.1w (<10 วินาที) · PVST+ (Cisco, หนึ่งชุดต่อ VLAN) · Rapid-PVST+ (default บน Cisco) · MSTP 802.1s

**3.3 BPDU และ Timer** (STP p.11–12; SWN p.68, 72)
- BPDU ส่งทุก 2 วินาที · field: Root Bridge ID, Sender Bridge ID, Root Path Cost, Port ID
- ประเภท: Configuration BPDU, TCN BPDU (Topology Change Notification)
- Timer: **Hello 2 วินาที, Forward Delay 15 วินาที, Max Age 20 วินาที**

**3.4 Root Bridge election** (STP p.14–15, 18; SWN p.66–71)
- **Bridge ID (8 byte) = Bridge Priority (default 32768, ปรับเป็นพหุคูณของ 4096) + MAC address**
- ค่าต่ำสุดชนะ: เทียบ priority ก่อน ถ้าเท่ากันดู MAC ต่ำสุด
- ตัวอย่าง: SW2 priority 24576 ชนะ SW1/SW3 ที่ 32768 แม้ MAC สูงกว่า (STP p.18)
- ตัวอย่าง 3 switch priority เท่ากัน ตัดสินด้วย MAC (SWN p.70–71)

**3.5 Port role และ Path cost** (STP p.16–17; SWN p.66–67)
- **Root Port**: path cost ไป root ต่ำสุด, หนึ่งพอร์ตต่อ non-root switch
- **Designated Port**: หนึ่งพอร์ตต่อ segment, ทุกพอร์ตบน root bridge เป็น DP
- **Blocking (Nondesignated) Port**: ไม่ส่ง data แต่ยังฟัง BPDU
- STP cost (802.1D): 10 Mbps = 100, 100 Mbps = 19, 1 Gbps = 4, 10 Gbps = 2 · Root path cost = ผลรวม cost ตลอดเส้นทาง

**3.6 Port state และ Convergence** (STP p.20–22; SWN p.73)
- Blocking (20 วินาที) → Listening (15) → Learning (15) → Forwarding · Disabled
- Listening: ประมวลผล BPDU ยังไม่เรียน MAC · Learning: เรียน MAC ยังไม่ forward
- STP รวม ~50 วินาที (Max Age 20 + Forward Delay 15 + 15)
- RSTP: state เหลือ Discarding / Learning / Forwarding · role ใหม่ **Alternate Port** (สำรองของ root port), **Backup Port** (สำรองของ designated port)
- RSTP เร็วเพราะใช้ Proposal/Agreement handshake ไม่รอ timer

**3.7 PVST+ กับ MSTP** (STP p.24–25)
- PVST+: root bridge แยกต่อ VLAN ได้ แต่ใช้ CPU สูงเมื่อ VLAN มาก
- MSTP: รวมหลาย VLAN เข้า instance เดียว · ตัวอย่าง CIST (VLAN 1, 999), Instance 1 (VLAN 10, 20, 30), Instance 2 (VLAN 40, 50, 60)

**3.8 Tuning และ Security** (STP p.27)
- `spanning-tree vlan 1 root primary` · `spanning-tree portfast` · `spanning-tree bpduguard enable` · `spanning-tree guard root`

### บทที่ 4: Inter-VLAN Routing — IVR (+ SWN)

**4.1 ทำไมต้องมี Layer 3** (IVR p.3; SWN p.50–51)
- VLAN แยก broadcast domain → host ต่าง VLAN คุยกันตรง ๆ ไม่ได้ · router ถอดและห่อ L2 frame ใหม่
- สองแนวทาง: physical link ต่อ VLAN กับ logical link บน trunk

**4.2 Router-on-a-Stick (ROAS)** (IVR p.5–8)
- trunk เส้นเดียว + sub-interface ต่อ VLAN แต่ละตัวถือ gateway IP
- ขาเข้า: อ่าน VID → ส่งเข้า sub-interface ที่ `encapsulation dot1Q` ตรงกัน → ลอก tag
- ขาออก: ใส่ 802.1Q header ใหม่ตาม VLAN ปลายทาง แล้วส่งออก trunk เส้นเดิม
- ข้อจำกัด (hairpinning): ส่ง 1 Gbps ข้าม VLAN ใช้ 2 Gbps บน trunk

**4.3 การตั้งค่า** (IVR p.10–14)
- Switch: สร้าง VLAN, access port + `switchport nonegotiate`, trunk + native VLAN 999
- Router: physical interface `no shutdown` (ไม่ใส่ IP), sub-interface `encapsulation dot1Q <vlan>` + `ip address`
- ตรวจ `show ip route`: `C` = connected, `L` = local

**4.4 Extended ACL บน sub-interface** (IVR p.15–16)
- โจทย์: VLAN 10 เข้า web server ของ VLAN 20 ได้เฉพาะ TCP 80/443
- ผูกทิศ `in` บน sub-interface ต้นทางเพื่อ drop ตั้งแต่รับเข้า

**4.5 การทดสอบด้วย Kali** (IVR p.17–21)
- `fping` (ping sweep), `nmap` (`-sn`, `-sS`; สถานะ open กับ filtered), `traceroute` (hop แรกคือ sub-interface), Wireshark

### บทที่ 5: Gateway Redundancy (FHRP) — FHRP, IVR

**5.1 ปัญหาและแนวคิด** (FHRP p.3–4; IVR p.23–24)
- client มี default gateway ได้ค่าเดียว → single point of failure
- FHRP: router ≥ 2 ตัวทำงานเป็น virtual router เดียว ด้วย **Virtual IP** และ **Virtual MAC**

**5.2 เปรียบเทียบ HSRP / VRRP / GLBP** (FHRP p.5; IVR p.25)

| | HSRP | VRRP | GLBP |
|---|---|---|---|
| มาตรฐาน | Cisco | IETF (RFC 3768 / 5798) | Cisco |
| บทบาท | Active / Standby (/ Listen) | Master / Backup | AVG / AVF (สูงสุด 4) |
| Virtual MAC | `0000.0C07.ACxx` (v1), `0000.0C9F.Fxxx` (v2) | `0000.5E00.01xx` | `0007.B400.xxyy` |
| Multicast / port | 224.0.0.2 (v1), 224.0.0.102 (v2), UDP 1985 | 224.0.0.18, IP protocol 112 | 224.0.0.102, UDP 3222 |
| Priority | 100 (1–255) | 100 (1–254; 255 = IP owner) | 100 (1–255) |
| Preempt (default) | ปิด | **เปิด** | ปิด |
| Hello / Hold | 3 / 10 วินาที | 1 / ~3.6 วินาที | 3 / 10 วินาที |
| Load balancing | ไม่มี | ไม่มี | มี (round-robin, weighted, host-dependent) |

**5.3 HSRP** (FHRP p.6–10; IVR p.26–27, 29)
- State: Initial → Learn → Listen → Speak → Standby → Active
- เลือก Active: priority สูงสุด ถ้าเท่ากันใช้ interface IP สูงสุด · ต้องเปิด `standby preempt` เองถ้าจะให้ยึดคืน
- v1 กับ v2: multicast, จำนวนกลุ่ม (0–255 กับ 0–4095), Virtual MAC, IPv6
- config: `standby version 2`, `standby 1 ip`, `standby 1 priority 110`, `standby 1 preempt`, `standby 1 timers 1 4` · `show standby brief`

**5.4 VRRP** (FHRP p.11–13; IVR p.30)
- **Master_Down_Interval = 3 × Advertisement_Interval + Skew_Time** และ **Skew_Time = (256 − Priority) / 256**
- ตัวอย่าง priority 100: skew ≈ 0.609 วินาที, down interval ≈ 3.609 วินาที
- config: `vrrp 1 ip`, `vrrp 1 priority`, `vrrp 1 timers advertise 1` · `show vrrp brief`

**5.5 GLBP** (FHRP p.14–16)
- AVG ตอบ ARP และแจก Virtual MAC · AVF แต่ละตัว forward ด้วย Virtual MAC ของตัวเอง
- ใช้ bandwidth ของ router ทุกตัวพร้อมกัน · `glbp 1 load-balancing round-robin` · `show glbp brief`

**5.6 Interface tracking** (IVR p.31; FHRP p.22)
- ปัญหา blackhole: WAN ของ Active ขาดแต่ LAN ยังปกติ
- `track 1 interface ... line-protocol` + `standby 10 track 1 decrement 30` → 120 − 30 = 90 < 100 ทำให้ R2 ขึ้นเป็น Active

**5.7 Failover และการวัด** (FHRP p.17–21; IVR p.32–34)
- ขั้นตอนทดสอบ: baseline → capture → ping ต่อเนื่อง → shutdown Active → ดูผล
- Filter: HSRP `udp port 1985`, VRRP `ip proto 112`, GLBP `udp port 3222`
- Convergence time ≈ T2 − T1 · HSRP/GLBP default ราว 10 วินาที, VRRP ราว 3.6 วินาที
- **Gratuitous ARP** อัปเดต MAC table ของ switch · Virtual MAC ไม่เปลี่ยน client จึงไม่ต้อง ARP ใหม่
- Best practice: preempt delay, object tracking, ปรับ timer ตาม SLA, BFD

### บทที่ 6: OSPF Single Area (ขั้นสูง) — OSPF

**6.1 Cost** (OSPF p.3)
- **Cost = Reference bandwidth / Interface bandwidth** · `auto-cost reference-bandwidth 10000` (default 100) ต้องตั้งเท่ากันทุก router
- ตัวอย่าง: 1000 Mbps → 10 · T1 1.544 Mbps → 6477

**6.2 DR/BDR election** (OSPF p.4–5)
- priority สูงสุดชนะ (0–255) ถ้าเท่ากันใช้ Router ID สูงสุด · **Non-preemptive**
- `ip ospf priority 0` = ไม่เป็น DR/BDR เลย (สถานะ DROTHER)

**6.3 Network type** (OSPF p.6)
- Broadcast: หลาย router, มี DR/BDR, LSA Type 1 + Type 2
- Point-to-Point: สอง router, ไม่มี DR/BDR, LSA Type 1 เท่านั้น · `ip ospf network point-to-point`

**6.4 Path selection และ ECMP** (OSPF p.7–8)
- เลือก cost รวมต่ำสุด: ผ่าน switch (20) ชนะลิงก์ตรง T1 (12,954)
- cost เท่ากัน → ติดตั้งทุกเส้นทาง (default สูงสุด 4 บน Cisco IOS) และ load balance

**6.5 MD5 authentication** (OSPF p.9–10)
- Key ID, password · ระดับ interface (`ip ospf authentication message-digest`, `ip ospf message-digest-key 1 md5 ...`) และระดับ area
- ป้องกัน: router ปลอม, spoofing · ป้องกันไม่ได้: การดักฟังเนื้อหา LSA, DoS

**6.6 Troubleshooting** (OSPF p.11–12)
- ลำดับตรวจ 8 ขั้น: interface, IP subnet, Area ID, Hello/Dead timer, network type, MTU (ค้าง ExStart/Exchange), authentication, ACL บล็อก IP protocol 89

### บทที่ 7: Advanced Routing และ WAN — WAN

**7.1 EIGRP และ DUAL** (WAN p.4–7)
- Advanced distance vector · Neighbor table, Topology table, Routing table
- Packet: Hello, Update, Query, Reply, ACK · metric เริ่มต้นใช้ Bandwidth + Delay
- **Successor** กับ **Feasible Successor** · Feasibility Condition: Reported Distance < Feasible Distance
- มี FS → สลับทันที · ไม่มี FS → route เข้า Active และส่ง Query
- config: `router eigrp 100`, `network ... <wildcard>`, `no auto-summary`

**7.2 Route summarization** (WAN p.8–9)
- วิธี: เรียง network → เทียบบิตจากซ้าย → นับ common prefix
- ตัวอย่าง: 10.10.0.0/24 – 10.10.3.0/24 → 10.10.0.0/22 · summary กว้างเกิน → black hole

**7.3 Redistribution** (WAN p.10–11)
- boundary router แลก route ระหว่าง EIGRP กับ OSPF · ต้องกำหนด metric · ระวัง route feedback/loop
- `redistribute eigrp 100 subnets metric 20 metric-type 1` และ `redistribute ospf 1 metric 10000 100 255 1 1500`

**7.4 Lab และการวิเคราะห์ traffic** (WAN p.12–16)
- EIGRP = IP protocol 88, OSPF = IP protocol 89 · `tcpdump -i eth0 proto 88 or proto 89`

**7.5 WAN** (WAN p.17–19)
- Topology: Point-to-Point, Hub-and-Spoke, Partial Mesh, Full Mesh
- PPP: LCP, NCP, PAP/CHAP · MPLS: PE/LER push/pop, P/LSR swap; MPLS VPN ไม่ได้เข้ารหัสอัตโนมัติ
- VPN: Site-to-Site กับ Remote-Access

---

## 2. จุดที่เอกสารต่างจากความรู้ทั่วไป หรือขัดกันเอง

| เรื่อง | ในเอกสาร | ทั่วไป | ที่มา |
|---|---|---|---|
| การปัด OSPF cost | 10000 / 1.544 = 6476.68 → 6477 (ปัดขึ้น) | Cisco IOS ตัดเศษทิ้ง (6476) | OSPF p.3, p.7 |
| Convergence ของ RSTP | "< 10 วินาที" | ปกติเร็วกว่านั้นมาก (ระดับวินาทีหรือต่ำกว่า) | STP p.10, 22 |
| VTP Client | "Not saved in NVRAM" | IOS รุ่นใหม่เก็บ VLAN database ใน `vlan.dat` ด้วย | SWN p.46 |
| HSRPv2 Virtual MAC | IVR เขียน `0000.0c9f.fXX` · FHRP เขียน `0000.0C9F.Fxxx` | แบบสามหลัก (`Fxxx`) ถูก เพราะ v2 มีกลุ่ม 0–4095 | IVR p.25, FHRP p.5 |
| บิตที่ 4 ของ 802.1Q TCI | VLAN เรียก CFI · IVR เรียก DEI | เป็น field เดียวกัน (CFI ถูกเปลี่ยนชื่อเป็น DEI) | VLAN p.7, IVR p.4 |
| HSRP state แรก | IVR: "Disabled/Initial" · FHRP: "Initial" | ชื่อเดียวกัน | IVR p.26, FHRP p.6 |
| Fragment-Free | "default ของ Catalyst 1900" | อุปกรณ์รุ่นเก่า ปัจจุบันใช้ store-and-forward เป็นหลัก | SWN p.23 |
| จำนวน VLAN ต่อ router | "Up to 255 VLANs per router" | ข้อจำกัดของอุปกรณ์รุ่นเก่า | SWN p.50 |

เฉลยข้อสอบจะยึดตามเอกสาร ในข้อที่เอกสารขัดกันเอง (HSRPv2 MAC) ผมจะใช้ค่าจากไฟล์ FHRP และใส่หมายเหตุ

---

## 3. Simulation ที่เสนอ

### ลำดับความสำคัญสูง

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S1 | MAC address learning | host บนแต่ละพอร์ต และลำดับ frame (ต้นทาง → ปลายทาง, หรือ broadcast) | Learn / Flood / Forward / Filter ของแต่ละ frame, MAC table ที่โตขึ้น, พอร์ตที่ frame ออก | 1 |
| S2 | Port Security และ MAC flooding | Maximum, learning (dynamic/sticky), violation mode, ลำดับ MAC ที่เข้าพอร์ต | MAC ที่ถูกเรียน, จุดที่เกิด violation, ผลของแต่ละ mode (ทิ้ง / log / err-disabled), เทียบกับกรณีไม่เปิด (CAM เต็ม → flood) | 1 |
| S3 | 802.1Q tagging บน trunk | VLAN ของ host ต้นทางและปลายทาง, Native VLAN ของแต่ละฝั่ง | frame ที่ access port, การใส่ tag ที่ trunk, การลอก tag, กรณี Native VLAN (untagged) และ mismatch | 2 |
| S4 | VLAN hopping: Double tagging | Native VLAN ของ trunk, VLAN เป้าหมาย, เปิด/ปิดมาตรการป้องกัน | frame สอง tag, switch ตัวแรกลอก outer tag, switch ตัวที่สองส่งตาม inner tag, และผลเมื่อเปลี่ยน Native VLAN | 2 |
| S5 | VTP revision number | mode และ revision ของแต่ละ switch, เหตุการณ์ (สร้าง VLAN บน server, ต่อ switch เก่าเข้าโดเมน) | advertisement ที่วิ่งผ่าน trunk, การเทียบ revision, VLAN database ที่ถูกเขียนทับ | 2 |
| S6 | STP: Root election และ Port role | priority และ MAC ของ switch 3–4 ตัว, ความเร็วของแต่ละลิงก์ | การเทียบ Bridge ID, root bridge, root path cost ของแต่ละเส้นทาง, Root / Designated / Blocking port | 3 |
| S7 | STP: Port state และ convergence | เลือกลิงก์ที่ล่ม, เลือก STP หรือ RSTP | timeline Blocking → Listening → Learning → Forwarding พร้อม timer 20/15/15, เวลารวม, เทียบกับ RSTP | 3 |
| S8 | Router-on-a-Stick | host ต้นทาง/ปลายทาง, ตาราง sub-interface, กฎ ACL | frame ติด tag ขึ้น trunk, sub-interface ที่รับ, ลอก tag, routing table, ตรวจ ACL, ใส่ tag ใหม่, ส่งกลับ trunk เดิม | 4 |
| S9 | FHRP failover | โพรโทคอล (HSRP/VRRP), priority ของ R1/R2, preempt, tracking decrement, เหตุการณ์ (R1 ล่ม, WAN ของ R1 ล่ม, R1 กลับมา) | Hello ที่ส่ง, hold timer หมด, การเลือก Active ใหม่, Gratuitous ARP, การยึดคืนเมื่อเปิด preempt, ค่า Master Down Interval ของ VRRP | 5 |
| S10 | OSPF cost และ path selection | reference bandwidth และ bandwidth ของแต่ละลิงก์ใน topology 4 router | cost ต่อลิงก์ตามสูตร, cost รวมต่อเส้นทาง, เส้นทางที่ถูกเลือก, ECMP เมื่อ cost เท่ากัน | 6 |

### ลำดับความสำคัญรอง

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S11 | Switching method | ขนาด frame, frame เสียหรือเป็น collision fragment, เลือกวิธี | จุดเวลาที่เริ่ม forward, latency, frame เสียหลุดผ่านหรือถูกทิ้ง | 1 |
| S12 | Broadcast storm | จำนวนลิงก์สำรอง, เปิด/ปิด STP | frame ที่ทวีคูณในแต่ละรอบ, MAC flapping ในตาราง | 3 |
| S13 | Private VLAN | ชนิดพอร์ตของแต่ละ host, คู่ต้นทาง/ปลายทาง | การตรวจกฎทีละข้อ และผลว่าคุยได้หรือไม่ | 2 |
| S14 | OSPF DR/BDR election | priority และ Router ID, ลำดับที่ router เข้าร่วม | การเทียบ priority และ Router ID, ผลแบบ non-preemptive เมื่อมี router ใหม่เข้ามา | 6 |
| S15 | Route summarization | รายการ network | แปลงเป็นฐานสอง, เทียบบิตจากซ้าย, common prefix, summary route และช่วงที่ครอบคลุม | 7 |
| S16 | EIGRP DUAL | cost ของแต่ละลิงก์, ลิงก์ที่ล่ม | Successor, การตรวจ Feasibility Condition, สลับไป FS ทันที หรือเข้า Active และส่ง Query | 7 |
| S17 | GLBP load balancing | จำนวน client, วิธี load balancing | AVG ตอบ ARP ด้วย Virtual MAC ของ AVF แต่ละตัว | 5 |
| S18 | MPLS label | เส้นทางผ่าน PE–P–PE | push, swap, pop ของ label ในแต่ละ hop | 7 |

ข้อเสนอ: ทำ S1–S10 ก่อน

---

## 4. น้ำหนักข้อสอบ (เดา)

ที่มาของการเดา: สัดส่วนหน้าสไลด์ชุดใหม่ และจำนวนข้อเท็จจริงที่ออกเป็นปรนัยได้ (ค่า default, คำสั่ง, สูตร)
**ไม่มีเกณฑ์คะแนน, ขอบเขตสอบ หรือข้อสอบเก่า** ตัวเลขนี้จึงเป็นการประมาณ และถ้าสอบครั้งนี้เป็นกลางภาค
ที่ครอบคลุมแค่บทต้น ๆ ต้องปรับใหม่ทั้งหมด

| หัวข้อ | น้ำหนัก | ข้อ / ชุด 70 ข้อ |
|---|---|---|
| 1 Ethernet, switching method, MAC table, domain | 12% | 8 |
| 1 Layer 2 attack และ Port Security | 8% | 6 |
| 2 VLAN, trunk, 802.1Q, Native VLAN | 12% | 8 |
| 2 VTP | 8% | 6 |
| 2 Private VLAN และ VLAN hopping | 8% | 6 |
| 3 STP ทั้งบท | 16% | 11 |
| 4 Inter-VLAN routing, ROAS, ACL | 10% | 7 |
| 5 FHRP: HSRP, VRRP, GLBP | 12% | 8 |
| 6 OSPF | 7% | 5 |
| 7 EIGRP, summarization, redistribution | 4% | 3 |
| 7 WAN: PPP, MPLS, VPN | 3% | 2 |
| รวม | 100% | 70 |

### สไตล์โจทย์ที่คาดจากเอกสาร

คำถามท้ายบทในสไลด์เป็นแบบอธิบาย (CH1 p.36, WAN p.20) ข้อสอบจำลองจะแปลงเป็นปรนัยตามแนวต่อไปนี้

- **เปรียบเทียบ** — switching method, violation mode, VTP mode, HSRP/VRRP/GLBP, STP กับ RSTP, PVST+ กับ MSTP
- **ค่า default และตัวเลข** — aging 300 วินาที, STP timer 2/15/20, priority 32768, HSRP 3/10, multicast address, port number
- **คำสั่ง Cisco IOS** — คำสั่งใดใช้ทำอะไร, บรรทัดใดขาดไปจาก config
- **คำนวณ** — root bridge จาก priority/MAC, root path cost, OSPF cost, VRRP master down interval, summary route, priority หลัง tracking decrement
- **วิเคราะห์สถานการณ์** — เลือกวิธีให้เหมาะกับงาน, เกิดอะไรเมื่อ Native VLAN ไม่ตรงกัน, เกิดอะไรเมื่อต่อ switch ที่ revision สูงกว่า
- **อ่าน output** — `show standby brief`, `show vrrp brief`, `show glbp brief`, ผล `nmap` (open กับ filtered)

---

## 5. โครงบทเรียนที่จะสร้างใน Step ถัดไป (เสนอ)

20 บทเรียน ชื่อไฟล์ `content/ist/NN-*.mdx`

| # | บทเรียน | chapter | sim |
|---|---|---|---|
| 01 | OSI, Ethernet frame และมาตรฐาน IEEE | 1 | – |
| 02 | Hub, Bridge, Switch และ switching method | 1 | S11 (รอง) |
| 03 | MAC address table | 1 | S1 |
| 04 | Collision domain กับ Broadcast domain | 1 | – |
| 05 | MAC flooding และ Port Security | 1 | S2 |
| 06 | VLAN, Access/Trunk และ 802.1Q | 2 | S3 |
| 07 | VTP | 2 | S5 |
| 08 | Native VLAN และ VLAN hopping | 2 | S4 |
| 09 | Private VLAN | 2 | S13 (รอง) |
| 10 | Layer 2 loop และแนวคิด STP | 3 | S12 (รอง) |
| 11 | Root Bridge, Port role, Path cost | 3 | S6 |
| 12 | Port state, RSTP, PVST+ และ MSTP | 3 | S7 |
| 13 | Inter-VLAN routing และ Router-on-a-Stick | 4 | S8 |
| 14 | Extended ACL และการทดสอบด้วย Kali | 4 | S8 |
| 15 | FHRP และ HSRP | 5 | S9 |
| 16 | VRRP, GLBP และการวัด failover | 5 | S9, S17 (รอง) |
| 17 | OSPF: cost, DR/BDR, network type | 6 | S10, S14 (รอง) |
| 18 | OSPF: authentication และ troubleshooting | 6 | – |
| 19 | EIGRP, summarization, redistribution | 7 | S15, S16 (รอง) |
| 20 | WAN: PPP, MPLS, VPN | 7 | S18 (รอง) |
