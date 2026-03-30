/**
 * E-SAMPAHKU AMCM - BACKEND ENGINE (Vercel & Multi-Month Ready)
 * Disesuaikan dengan Database Spreadsheet User: Users & Pembayaran
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_WARGA = SS.getSheetByName("Users");
const SHEET_BAYAR = SS.getSheetByName("Pembayaran");
const SHEET_CONFIG = SS.getSheetByName("Settings"); 

/**
 * BRIDGE FOR VERCEL (CORS & POST Handler)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const funcName = data.functionName;
    const params = data.parameters || [];
    
    const result = this[funcName].apply(null, params);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LOGIN LOGIC - Berdasarkan kolom di Screenshot
 * A:ID, B:Email, C:Pass, D:Nama, E:Blok, F:No_Rumah, G:No_WA, H:Role, I:Foto
 */
function prosesLogin(email, hashedPass) {
  const data = SHEET_WARGA.getDataRange().getValues();
  const config = getSettings();
  
  for (let i = 1; i < data.length; i++) {
    // Index 1 = Kolom B (Email), Index 2 = Kolom C (Password)
    if (data[i][1] === email && data[i][2] === hashedPass) {
      return {
        status: 'success',
        user: {
          id: data[i][0],      // Kolom A
          email: data[i][1],   // Kolom B
          nama: data[i][3],    // Kolom D
          blok: data[i][4],    // Kolom E
          no: data[i][5],      // Kolom F
          wa: data[i][6],      // Kolom G
          role: data[i][7],    // Kolom H
          foto: data[i][8]     // Kolom I
        },
        biaya: config.biaya,
        pengumuman: config.pengumuman
      };
    }
  }
  return { status: 'fail' };
}

/**
 * SETTINGS LOGIC
 */
function getSettings() {
  // Jika sheet Settings belum ada, buat default
  if (!SHEET_CONFIG) {
    return { biaya: 25000, pengumuman: "Selamat Datang di E-SampahKu AMCM!" };
  }
  const data = SHEET_CONFIG.getDataRange().getValues();
  return {
    biaya: data[0] ? data[0][1] : 25000,
    pengumuman: data[1] ? data[1][1] : ""
  };
}

function simpanPengaturan(biaya, pengumuman) {
  let sh = SHEET_CONFIG;
  if (!sh) {
    sh = SS.insertSheet("Settings");
  }
  sh.getRange("A1:B2").setValues([
    ["biaya_iuran", biaya],
    ["pengumuman_global", pengumuman]
  ]);
  return "Pengaturan berhasil diperbarui!";
}

/**
 * MULTI-MONTH PAYMENT LOGIC
 */
function simpanPembayaranMulti(userId, listBulan, tahun, biayaPerBulan, base64Image) {
  // Folder ID Google Drive untuk simpan bukti transfer
  const folderId = "GANTI_DENGAN_FOLDER_ID_DRIVE_LO"; 
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Image), "image/png", `Bukti_${userId}_${Date.now()}.png`);
  const fileUrl = folder.createFile(blob).getUrl();
  
  const dataBayar = SHEET_BAYAR.getDataRange().getValues();
  
  listBulan.forEach(bulan => {
    let rowFound = -1;
    // Cari apakah sudah ada baris untuk user, bulan, dan tahun tersebut
    for (let i = 1; i < dataBayar.length; i++) {
      if (dataBayar[i][0] == userId && dataBayar[i][1] == bulan && dataBayar[i][2] == tahun) {
        rowFound = i + 1;
        break;
      }
    }
    
    // Format Kolom di Sheet Pembayaran:
    // A: ID_User, B: Bulan, C: Tahun, D: Nominal, E: Status, F: Link_Bukti, G: Tgl_Upload
    const rowData = [
      userId, 
      bulan, 
      tahun, 
      biayaPerBulan, 
      "Pending", 
      fileUrl, 
      new Date()
    ];
    
    if (rowFound > -1) {
      SHEET_BAYAR.getRange(rowFound, 1, 1, 7).setValues([rowData]);
    } else {
      SHEET_BAYAR.appendRow(rowData);
    }
  });
  
  return `Berhasil! Pembayaran ${listBulan.length} bulan telah dikirim.`;
}

/**
 * GET TAGIHAN STATUS
 */
function getTagihanWarga(userId, tahun) {
  const data = SHEET_BAYAR.getDataRange().getValues();
  const res = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == userId && data[i][2] == tahun) {
      res[data[i][1]] = data[i][4]; // Mengambil status (Lunas/Pending)
    }
  }
  return res;
}

/**
 * GET ALL RESIDENTS (Admin Only)
 */
function getSemuaWarga() {
  const data = SHEET_WARGA.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    results.push({
      id: data[i][0],
      email: data[i][1],
      nama: data[i][3],
      blok: data[i][4],
      no: data[i][5],
      wa: data[i][6],
      role: data[i][7],
      foto: data[i][8]
    });
  }
  return results;
}
