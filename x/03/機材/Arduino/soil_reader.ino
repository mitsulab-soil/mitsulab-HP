// UNO互換: 容量式土壌センサーのアナログ出力をA0へ。
// 電源電圧とGNDはセンサーの仕様を確認。振動装置をGPIOに接続しない。
void setup() { Serial.begin(115200); }
void loop() {
  Serial.print("{\"soil_raw\":"); Serial.print(analogRead(A0)); Serial.println("}");
  delay(200);
}
