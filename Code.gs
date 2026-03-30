/**
 * KONFIGURASI SPREADSHEET
 */
const SPREADSHEET_ID = "ISI_DENGAN_ID_SPREADSHEET_LO"; // Contoh: 1abc123...
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const sheetUsers = ss.getSheetByName("Users");
const sheetSettings = ss.getSheetByName("Settings");

/**
 * 1. FUNGSI UNTUK AKSES LANGSUNG (CEK STATUS)
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Backend E-SampahKu Ready"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 2. FUNGSI PINTU MASUK (BRIDGE) UNTUK VERCEL
 * Ini yang paling penting supaya fetch() dari Vercel bisa jalan.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const functionName = data.functionName;
    const parameters = data.parameters || [];
    
    // Panggil fungsi secara dinamis berdasarkan nama yang dikirim dari Index.html
    const result = this[functionName].apply(null, parameters);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. FUNGSI LOGIKA: LOGIN
 */
function prosesLogin(email, password) {
  const data = sheetUsers.getDataRange().getValues();
  // Asumsi: Kolom B = Email, Kolom C = Password, Kolom D = Nama, Kolom E = Role, Kolom F = Foto
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email && data[i][2] === password) {
      return {
        status: "success",
        user: {
          id: data[i][0],
          nama: data[i][3],
          role: data[i][4],
          foto: data[i][5]
        }
      };
    }
  }
  return { status: "error", message: "User tidak ditemukan atau password salah" };
}

/**
 * 4. FUNGSI LOGIKA: AMBIL SEMUA WARGA
 */
function getSemuaWarga() {
  const data = sheetUsers.getDataRange().getValues();
  const result = [];
  // Kolom: A:ID, B:Email, C:Pass, D:Nama, E:Role, F:Foto, G:Blok, H:No, I:WA
  for (let i = 1; i < data.length; i++) {
    result.push({
      id: data[i][0],
      email: data[i][1],
      nama: data[i][3],
      role: data[i][4],
      foto: data[i][5],
      blok: data[i][6],
      no: data[i][7],
      wa: data[i][8]
    });
  }
  return result;
}

/**
 * 5. FUNGSI LOGIKA: AMBIL SETTINGS
 */
function getSettings() {
  const data = sheetSettings.getDataRange().getValues();
  // Asumsi Sheet Settings: Baris 1 Biaya, Baris 2 Pengumuman
  return {
    biaya: data[0][1],
    pengumuman: data[1][1]
  };
}

/**
 * 6. FUNGSI LOGIKA: SIMPAN PENGATURAN
 */
function simpanPengaturan(biaya, pengumuman) {
  sheetSettings.getRange("B1").setValue(biaya);
  sheetSettings.getRange("B2").setValue(pengumuman);
  return "Pengaturan Berhasil Disimpan!";
}
