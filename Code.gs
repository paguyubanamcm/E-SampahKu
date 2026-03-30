/**
 * SISTEM SAMPAHKU AMCM - SERVER SIDE (Google Apps Script)
 * Versi Perbaikan: Handle baris kosong di Spreadsheet
 */

function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('SAMPAHKU AMCM')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Error: Pastikan nama file HTML Anda adalah 'index'. Detail: " + err.toString());
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const funcName = data.functionName;
    const params = data.parameters || [];
    if (typeof this[funcName] === 'function') {
      const result = this[funcName].apply(null, params);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("Fungsi " + funcName + " tidak ditemukan");
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- LOGIC LOGIN (Sheet: Users) ---

function prosesLogin(email, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users'); 
  
  if (!sheet) {
    return { status: 'error', message: 'Sheet "Users" tidak ditemukan!' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Looping mulai baris ke-2 (index 1)
  for (let i = 1; i < data.length; i++) {
    // PROTEKSI: Cek apakah baris ini kosong atau tidak ada emailnya
    if (!data[i][0] || !data[i][1]) continue; 

    const sheetEmail = data[i][0].toString().trim().toLowerCase();
    const sheetPass = data[i][1].toString().trim();
    
    if (sheetEmail === email.trim().toLowerCase() && sheetPass === password.toString().trim()) {
      return {
        status: 'success',
        user: {
          id: i, 
          email: data[i][0],
          nama: data[i][2] || "User",
          blok: data[i][3] || "-",
          no: data[i][4] || "-",
          role: data[i][5] ? data[i][5].toString().toLowerCase() : 'warga'
        }
      };
    }
  }
  return { status: 'error', message: 'Email atau Password salah atau tidak terdaftar!' };
}

// --- LOGIC DATA LAINNYA ---

function getSemuaWarga() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const result = [];
  for (let i = 1; i < data.length; i++) {
    // Lewati baris kalau kolom Nama (kolom C) kosong
    if (!data[i][2]) continue; 
    
    result.push({
      email: data[i][0],
      nama: data[i][2],
      blok: data[i][3] || '-',
      no: data[i][4] || '-',
      role: data[i][5] || 'warga'
    });
  }
  return result;
}
