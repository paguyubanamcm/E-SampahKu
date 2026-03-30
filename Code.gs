/**
 * KONFIGURASI SPREADSHEET
 */
const SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_LO"; 
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
const sheetUsers = ss.getSheetByName("Users");
const sheetSettings = ss.getSheetByName("Settings");

/**
 * FUNGSI HELPER: GENERATE HASH (SHA-256)
 */
function generateHash(text) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return digest.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Backend E-SampahKu Ready"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const functionName = data.functionName;
    const parameters = data.parameters || [];
    
    // Eksekusi fungsi
    const result = this[functionName].apply(null, parameters);
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FUNGSI LOGIN (SUPPORT TEXT BIASA ATAU HASH)
 */
function prosesLogin(email, password) {
  const data = sheetUsers.getDataRange().getValues();
  const inputHash = generateHash(password); // Kita siapkan versi hash dari input user

  // Iterasi mulai baris ke-2 (index 1)
  for (let i = 1; i < data.length; i++) {
    const dbEmail = data[i][1];
    const dbPass = data[i][2].toString(); // Password dari spreadsheet

    if (dbEmail === email) {
      // Cek apakah password di DB cocok (baik teks biasa maupun hash)
      if (dbPass === password || dbPass === inputHash) {
        return {
          status: "success",
          user: {
            id: data[i][0],
            nama: data[i][3],
            role: data[i][4],
            foto: data[i][5],
            blok: data[i][6],
            no: data[i][7],
            wa: data[i][8]
          }
        };
      }
    }
  }
  return { status: "error", message: "Email atau Password salah!" };
}

function getSemuaWarga() {
  const data = sheetUsers.getDataRange().getValues();
  const result = [];
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

function getSettings() {
  const data = sheetSettings.getDataRange().getValues();
  return {
    biaya: data[0][1],
    pengumuman: data[1][1]
  };
}

function simpanPengaturan(biaya, pengumuman) {
  sheetSettings.getRange("B1").setValue(biaya);
  sheetSettings.getRange("B2").setValue(pengumuman);
  return "Pengaturan Berhasil Disimpan!";
}
