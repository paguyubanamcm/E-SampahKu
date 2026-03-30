/**
 * SISTEM IURAN WARGA AMC MOJOSARI - BACKEND (Code.gs)
 * Deskripsi: Menangani semua permintaan data dari Frontend ke Google Sheets.
 */

const SPREADSHEET_ID = '1M_eEywnjoj9rzSBOJZ8Yxf-Q4lYXMA5lX4GTd0sgXJU'; // Ganti dengan ID Spreadsheet lo
const SHEET_WARGA = 'Users';
const SHEET_IURAN = 'Pembayaran';
const SHEET_PENGATURAN = 'Pengaturan';

/**
 * BRIDGE VERCEL / WEB APP
 * Fungsi ini menangkap request POST dari Frontend (Vercel) dan memprosesnya.
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const functionName = requestData.functionName;
    const parameters = requestData.parameters || [];
    
    // Memanggil fungsi berdasarkan nama yang dikirim dari Frontend
    if (typeof this[functionName] === 'function') {
      const result = this[functionName].apply(null, parameters);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      throw new Error("Fungsi '" + functionName + "' tidak ditemukan di script.");
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 1. LOGIKA LOGIN
 */
function prosesLogin(email, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Kolom B: Email, Kolom C: Password
    if (data[i][1] === email && data[i][2].toString() === password.toString()) {
      return {
        status: 'success',
        user: {
          id: data[i][0],
          email: data[i][1],
          nama: data[i][3],
          blok: data[i][4],
          no: data[i][5],
          wa: data[i][6],
          role: data[i][7]
        }
      };
    }
  }
  return { status: 'error', message: 'Email atau Password salah!' };
}

/**
 * 2. AMBIL SEMUA DATA WARGA (UNTUK ADMIN)
 */
function getSemuaWarga() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    result.push({
      id: data[i][0],
      email: data[i][1],
      nama: data[i][3],
      blok: data[i][4],
      no: data[i][5],
      wa: data[i][6],
      role: data[i][7]
    });
  }
  return result;
}

/**
 * 3. SIMPAN WARGA BARU & INISIALISASI IURAN
 */
function simpanWargaBaru(email, pass, nama, blok, no, wa, role) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetW = ss.getSheetByName(SHEET_WARGA);
  const id = "W-" + new Date().getTime();
  
  // Tambah ke Sheet Warga
  sheetW.appendRow([id, email, pass, nama, blok, no, wa, role]);
  
  // Tambah baris kosong ke Sheet Iuran (Januari - Desember)
  const sheetI = ss.getSheetByName(SHEET_IURAN);
  const barisIuran = [id, nama];
  for(let i=0; i<12; i++) barisIuran.push("Belum Bayar");
  sheetI.appendRow(barisIuran);
  
  return { status: 'success', message: 'Warga ' + nama + ' berhasil didaftarkan!' };
}

/**
 * 4. EDIT DATA WARGA
 */
function editWarga(id, email, pass, nama, blok, no, wa, role, adminRole) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_WARGA);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(email);
      if (pass !== "") sheet.getRange(row, 3).setValue(pass);
      sheet.getRange(row, 4).setValue(nama);
      sheet.getRange(row, 5).setValue(blok);
      sheet.getRange(row, 6).setValue(no);
      sheet.getRange(row, 7).setValue(wa);
      
      // Hanya Superadmin yang bisa ubah Role
      if (adminRole === 'superadmin') {
        sheet.getRange(row, 8).setValue(role);
      }
      return "Data warga berhasil diperbarui!";
    }
  }
  return "Data tidak ditemukan!";
}

/**
 * 5. HAPUS WARGA (HAPUS DATA & RIWAYAT IURAN)
 */
function hapusWarga(id, adminRole) {
  if (adminRole !== 'superadmin' && adminRole !== 'admin') return "Akses ditolak!";
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetW = ss.getSheetByName(SHEET_WARGA);
  const sheetI = ss.getSheetByName(SHEET_IURAN);
  
  // Cari dan hapus di Sheet Warga
  const dataW = sheetW.getDataRange().getValues();
  for(let i=1; i<dataW.length; i++) {
    if(dataW[i][0] === id) {
      sheetW.deleteRow(i + 1);
      break;
    }
  }
  
  // Cari dan hapus di Sheet Iuran
  const dataI = sheetI.getDataRange().getValues();
  for(let j=1; j<dataI.length; j++) {
    if(dataI[j][0] === id) {
      sheetI.deleteRow(j + 1);
      break;
    }
  }
  
  return "Data warga dan seluruh riwayat iuran telah dihapus.";
}

/**
 * 6. SIMPAN PENGATURAN GLOBAL
 */
function simpanPengaturan(nominal, pengumuman) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PENGATURAN);
  // Asumsi B1: Nominal, B2: Teks Pengumuman
  sheet.getRange("B1").setValue(nominal);
  sheet.getRange("B2").setValue(pengumuman);
  return "Pengaturan sistem berhasil disimpan.";
}

/**
 * 7. RESET SEMUA IURAN (AWAL TAHUN)
 */
function resetSemuaDataPembayaran(adminRole) {
  if (adminRole !== 'superadmin') return "Hanya Superadmin yang bisa melakukan reset!";
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetI = ss.getSheetByName(SHEET_IURAN);
  const lastRow = sheetI.getLastRow();
  const lastCol = sheetI.getLastColumn();
  
  if (lastRow > 1) {
    // Kolom C s/d N (Jan-Des) direset ke "Belum Bayar"
    const range = sheetI.getRange(2, 3, lastRow - 1, 12);
    const resetValues = [];
    for(let r=0; r<lastRow-1; r++) {
      resetValues.push(["Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar","Belum Bayar"]);
    }
    range.setValues(resetValues);
  }
  return "Seluruh data pembayaran telah direset ke 'Belum Bayar'.";
}
