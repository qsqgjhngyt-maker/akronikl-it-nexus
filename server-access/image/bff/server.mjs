var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server-access/node_modules/jpeg-js/lib/encoder.js
var require_encoder = __commonJS({
  "server-access/node_modules/jpeg-js/lib/encoder.js"(exports, module) {
    var btoa = btoa || function(buf) {
      return Buffer.from(buf).toString("base64");
    };
    function JPEGEncoder(quality) {
      var self = this;
      var fround = Math.round;
      var ffloor = Math.floor;
      var YTable = new Array(64);
      var UVTable = new Array(64);
      var fdtbl_Y = new Array(64);
      var fdtbl_UV = new Array(64);
      var YDC_HT;
      var UVDC_HT;
      var YAC_HT;
      var UVAC_HT;
      var bitcode = new Array(65535);
      var category = new Array(65535);
      var outputfDCTQuant = new Array(64);
      var DU = new Array(64);
      var byteout = [];
      var bytenew = 0;
      var bytepos = 7;
      var YDU = new Array(64);
      var UDU = new Array(64);
      var VDU = new Array(64);
      var clt = new Array(256);
      var RGB_YUV_TABLE = new Array(2048);
      var currentQuality;
      var ZigZag = [
        0,
        1,
        5,
        6,
        14,
        15,
        27,
        28,
        2,
        4,
        7,
        13,
        16,
        26,
        29,
        42,
        3,
        8,
        12,
        17,
        25,
        30,
        41,
        43,
        9,
        11,
        18,
        24,
        31,
        40,
        44,
        53,
        10,
        19,
        23,
        32,
        39,
        45,
        52,
        54,
        20,
        22,
        33,
        38,
        46,
        51,
        55,
        60,
        21,
        34,
        37,
        47,
        50,
        56,
        59,
        61,
        35,
        36,
        48,
        49,
        57,
        58,
        62,
        63
      ];
      var std_dc_luminance_nrcodes = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
      var std_dc_luminance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_luminance_nrcodes = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
      var std_ac_luminance_values = [
        1,
        2,
        3,
        0,
        4,
        17,
        5,
        18,
        33,
        49,
        65,
        6,
        19,
        81,
        97,
        7,
        34,
        113,
        20,
        50,
        129,
        145,
        161,
        8,
        35,
        66,
        177,
        193,
        21,
        82,
        209,
        240,
        36,
        51,
        98,
        114,
        130,
        9,
        10,
        22,
        23,
        24,
        25,
        26,
        37,
        38,
        39,
        40,
        41,
        42,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        241,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      var std_dc_chrominance_nrcodes = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
      var std_dc_chrominance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_chrominance_nrcodes = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119];
      var std_ac_chrominance_values = [
        0,
        1,
        2,
        3,
        17,
        4,
        5,
        33,
        49,
        6,
        18,
        65,
        81,
        7,
        97,
        113,
        19,
        34,
        50,
        129,
        8,
        20,
        66,
        145,
        161,
        177,
        193,
        9,
        35,
        51,
        82,
        240,
        21,
        98,
        114,
        209,
        10,
        22,
        36,
        52,
        225,
        37,
        241,
        23,
        24,
        25,
        26,
        38,
        39,
        40,
        41,
        42,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      function initQuantTables(sf) {
        var YQT = [
          16,
          11,
          10,
          16,
          24,
          40,
          51,
          61,
          12,
          12,
          14,
          19,
          26,
          58,
          60,
          55,
          14,
          13,
          16,
          24,
          40,
          57,
          69,
          56,
          14,
          17,
          22,
          29,
          51,
          87,
          80,
          62,
          18,
          22,
          37,
          56,
          68,
          109,
          103,
          77,
          24,
          35,
          55,
          64,
          81,
          104,
          113,
          92,
          49,
          64,
          78,
          87,
          103,
          121,
          120,
          101,
          72,
          92,
          95,
          98,
          112,
          100,
          103,
          99
        ];
        for (var i = 0; i < 64; i++) {
          var t = ffloor((YQT[i] * sf + 50) / 100);
          if (t < 1) {
            t = 1;
          } else if (t > 255) {
            t = 255;
          }
          YTable[ZigZag[i]] = t;
        }
        var UVQT = [
          17,
          18,
          24,
          47,
          99,
          99,
          99,
          99,
          18,
          21,
          26,
          66,
          99,
          99,
          99,
          99,
          24,
          26,
          56,
          99,
          99,
          99,
          99,
          99,
          47,
          66,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99
        ];
        for (var j = 0; j < 64; j++) {
          var u = ffloor((UVQT[j] * sf + 50) / 100);
          if (u < 1) {
            u = 1;
          } else if (u > 255) {
            u = 255;
          }
          UVTable[ZigZag[j]] = u;
        }
        var aasf = [
          1,
          1.387039845,
          1.306562965,
          1.175875602,
          1,
          0.785694958,
          0.5411961,
          0.275899379
        ];
        var k = 0;
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 8; col++) {
            fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            k++;
          }
        }
      }
      function computeHuffmanTbl(nrcodes, std_table) {
        var codevalue = 0;
        var pos_in_table = 0;
        var HT = new Array();
        for (var k = 1; k <= 16; k++) {
          for (var j = 1; j <= nrcodes[k]; j++) {
            HT[std_table[pos_in_table]] = [];
            HT[std_table[pos_in_table]][0] = codevalue;
            HT[std_table[pos_in_table]][1] = k;
            pos_in_table++;
            codevalue++;
          }
          codevalue *= 2;
        }
        return HT;
      }
      function initHuffmanTbl() {
        YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
        UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
        YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
        UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
      }
      function initCategoryNumber() {
        var nrlower = 1;
        var nrupper = 2;
        for (var cat = 1; cat <= 15; cat++) {
          for (var nr = nrlower; nr < nrupper; nr++) {
            category[32767 + nr] = cat;
            bitcode[32767 + nr] = [];
            bitcode[32767 + nr][1] = cat;
            bitcode[32767 + nr][0] = nr;
          }
          for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
            category[32767 + nrneg] = cat;
            bitcode[32767 + nrneg] = [];
            bitcode[32767 + nrneg][1] = cat;
            bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
          }
          nrlower <<= 1;
          nrupper <<= 1;
        }
      }
      function initRGBYUVTable() {
        for (var i = 0; i < 256; i++) {
          RGB_YUV_TABLE[i] = 19595 * i;
          RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
          RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
          RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
          RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
          RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
          RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
          RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
        }
      }
      function writeBits(bs) {
        var value = bs[0];
        var posval = bs[1] - 1;
        while (posval >= 0) {
          if (value & 1 << posval) {
            bytenew |= 1 << bytepos;
          }
          posval--;
          bytepos--;
          if (bytepos < 0) {
            if (bytenew == 255) {
              writeByte(255);
              writeByte(0);
            } else {
              writeByte(bytenew);
            }
            bytepos = 7;
            bytenew = 0;
          }
        }
      }
      function writeByte(value) {
        byteout.push(value);
      }
      function writeWord(value) {
        writeByte(value >> 8 & 255);
        writeByte(value & 255);
      }
      function fDCTQuant(data, fdtbl) {
        var d0, d1, d2, d3, d4, d5, d6, d7;
        var dataOff = 0;
        var i;
        var I8 = 8;
        var I64 = 64;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 1];
          d2 = data[dataOff + 2];
          d3 = data[dataOff + 3];
          d4 = data[dataOff + 4];
          d5 = data[dataOff + 5];
          d6 = data[dataOff + 6];
          d7 = data[dataOff + 7];
          var tmp0 = d0 + d7;
          var tmp7 = d0 - d7;
          var tmp1 = d1 + d6;
          var tmp6 = d1 - d6;
          var tmp2 = d2 + d5;
          var tmp5 = d2 - d5;
          var tmp3 = d3 + d4;
          var tmp4 = d3 - d4;
          var tmp10 = tmp0 + tmp3;
          var tmp13 = tmp0 - tmp3;
          var tmp11 = tmp1 + tmp2;
          var tmp12 = tmp1 - tmp2;
          data[dataOff] = tmp10 + tmp11;
          data[dataOff + 4] = tmp10 - tmp11;
          var z1 = (tmp12 + tmp13) * 0.707106781;
          data[dataOff + 2] = tmp13 + z1;
          data[dataOff + 6] = tmp13 - z1;
          tmp10 = tmp4 + tmp5;
          tmp11 = tmp5 + tmp6;
          tmp12 = tmp6 + tmp7;
          var z5 = (tmp10 - tmp12) * 0.382683433;
          var z2 = 0.5411961 * tmp10 + z5;
          var z4 = 1.306562965 * tmp12 + z5;
          var z3 = tmp11 * 0.707106781;
          var z11 = tmp7 + z3;
          var z13 = tmp7 - z3;
          data[dataOff + 5] = z13 + z2;
          data[dataOff + 3] = z13 - z2;
          data[dataOff + 1] = z11 + z4;
          data[dataOff + 7] = z11 - z4;
          dataOff += 8;
        }
        dataOff = 0;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 8];
          d2 = data[dataOff + 16];
          d3 = data[dataOff + 24];
          d4 = data[dataOff + 32];
          d5 = data[dataOff + 40];
          d6 = data[dataOff + 48];
          d7 = data[dataOff + 56];
          var tmp0p2 = d0 + d7;
          var tmp7p2 = d0 - d7;
          var tmp1p2 = d1 + d6;
          var tmp6p2 = d1 - d6;
          var tmp2p2 = d2 + d5;
          var tmp5p2 = d2 - d5;
          var tmp3p2 = d3 + d4;
          var tmp4p2 = d3 - d4;
          var tmp10p2 = tmp0p2 + tmp3p2;
          var tmp13p2 = tmp0p2 - tmp3p2;
          var tmp11p2 = tmp1p2 + tmp2p2;
          var tmp12p2 = tmp1p2 - tmp2p2;
          data[dataOff] = tmp10p2 + tmp11p2;
          data[dataOff + 32] = tmp10p2 - tmp11p2;
          var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781;
          data[dataOff + 16] = tmp13p2 + z1p2;
          data[dataOff + 48] = tmp13p2 - z1p2;
          tmp10p2 = tmp4p2 + tmp5p2;
          tmp11p2 = tmp5p2 + tmp6p2;
          tmp12p2 = tmp6p2 + tmp7p2;
          var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433;
          var z2p2 = 0.5411961 * tmp10p2 + z5p2;
          var z4p2 = 1.306562965 * tmp12p2 + z5p2;
          var z3p2 = tmp11p2 * 0.707106781;
          var z11p2 = tmp7p2 + z3p2;
          var z13p2 = tmp7p2 - z3p2;
          data[dataOff + 40] = z13p2 + z2p2;
          data[dataOff + 24] = z13p2 - z2p2;
          data[dataOff + 8] = z11p2 + z4p2;
          data[dataOff + 56] = z11p2 - z4p2;
          dataOff++;
        }
        var fDCTQuant2;
        for (i = 0; i < I64; ++i) {
          fDCTQuant2 = data[i] * fdtbl[i];
          outputfDCTQuant[i] = fDCTQuant2 > 0 ? fDCTQuant2 + 0.5 | 0 : fDCTQuant2 - 0.5 | 0;
        }
        return outputfDCTQuant;
      }
      function writeAPP0() {
        writeWord(65504);
        writeWord(16);
        writeByte(74);
        writeByte(70);
        writeByte(73);
        writeByte(70);
        writeByte(0);
        writeByte(1);
        writeByte(1);
        writeByte(0);
        writeWord(1);
        writeWord(1);
        writeByte(0);
        writeByte(0);
      }
      function writeAPP1(exifBuffer) {
        if (!exifBuffer) return;
        writeWord(65505);
        if (exifBuffer[0] === 69 && exifBuffer[1] === 120 && exifBuffer[2] === 105 && exifBuffer[3] === 102) {
          writeWord(exifBuffer.length + 2);
        } else {
          writeWord(exifBuffer.length + 5 + 2);
          writeByte(69);
          writeByte(120);
          writeByte(105);
          writeByte(102);
          writeByte(0);
        }
        for (var i = 0; i < exifBuffer.length; i++) {
          writeByte(exifBuffer[i]);
        }
      }
      function writeSOF0(width, height) {
        writeWord(65472);
        writeWord(17);
        writeByte(8);
        writeWord(height);
        writeWord(width);
        writeByte(3);
        writeByte(1);
        writeByte(17);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(1);
        writeByte(3);
        writeByte(17);
        writeByte(1);
      }
      function writeDQT() {
        writeWord(65499);
        writeWord(132);
        writeByte(0);
        for (var i = 0; i < 64; i++) {
          writeByte(YTable[i]);
        }
        writeByte(1);
        for (var j = 0; j < 64; j++) {
          writeByte(UVTable[j]);
        }
      }
      function writeDHT() {
        writeWord(65476);
        writeWord(418);
        writeByte(0);
        for (var i = 0; i < 16; i++) {
          writeByte(std_dc_luminance_nrcodes[i + 1]);
        }
        for (var j = 0; j <= 11; j++) {
          writeByte(std_dc_luminance_values[j]);
        }
        writeByte(16);
        for (var k = 0; k < 16; k++) {
          writeByte(std_ac_luminance_nrcodes[k + 1]);
        }
        for (var l = 0; l <= 161; l++) {
          writeByte(std_ac_luminance_values[l]);
        }
        writeByte(1);
        for (var m = 0; m < 16; m++) {
          writeByte(std_dc_chrominance_nrcodes[m + 1]);
        }
        for (var n = 0; n <= 11; n++) {
          writeByte(std_dc_chrominance_values[n]);
        }
        writeByte(17);
        for (var o = 0; o < 16; o++) {
          writeByte(std_ac_chrominance_nrcodes[o + 1]);
        }
        for (var p = 0; p <= 161; p++) {
          writeByte(std_ac_chrominance_values[p]);
        }
      }
      function writeCOM(comments) {
        if (typeof comments === "undefined" || comments.constructor !== Array) return;
        comments.forEach((e) => {
          if (typeof e !== "string") return;
          writeWord(65534);
          var l = e.length;
          writeWord(l + 2);
          var i;
          for (i = 0; i < l; i++)
            writeByte(e.charCodeAt(i));
        });
      }
      function writeSOS() {
        writeWord(65498);
        writeWord(12);
        writeByte(3);
        writeByte(1);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(3);
        writeByte(17);
        writeByte(0);
        writeByte(63);
        writeByte(0);
      }
      function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
        var EOB = HTAC[0];
        var M16zeroes = HTAC[240];
        var pos;
        var I16 = 16;
        var I63 = 63;
        var I64 = 64;
        var DU_DCT = fDCTQuant(CDU, fdtbl);
        for (var j = 0; j < I64; ++j) {
          DU[ZigZag[j]] = DU_DCT[j];
        }
        var Diff = DU[0] - DC;
        DC = DU[0];
        if (Diff == 0) {
          writeBits(HTDC[0]);
        } else {
          pos = 32767 + Diff;
          writeBits(HTDC[category[pos]]);
          writeBits(bitcode[pos]);
        }
        var end0pos = 63;
        for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {
        }
        ;
        if (end0pos == 0) {
          writeBits(EOB);
          return DC;
        }
        var i = 1;
        var lng;
        while (i <= end0pos) {
          var startpos = i;
          for (; DU[i] == 0 && i <= end0pos; ++i) {
          }
          var nrzeroes = i - startpos;
          if (nrzeroes >= I16) {
            lng = nrzeroes >> 4;
            for (var nrmarker = 1; nrmarker <= lng; ++nrmarker)
              writeBits(M16zeroes);
            nrzeroes = nrzeroes & 15;
          }
          pos = 32767 + DU[i];
          writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
          writeBits(bitcode[pos]);
          i++;
        }
        if (end0pos != I63) {
          writeBits(EOB);
        }
        return DC;
      }
      function initCharLookupTable() {
        var sfcc = String.fromCharCode;
        for (var i = 0; i < 256; i++) {
          clt[i] = sfcc(i);
        }
      }
      this.encode = function(image, quality2) {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (quality2) setQuality(quality2);
        byteout = new Array();
        bytenew = 0;
        bytepos = 7;
        writeWord(65496);
        writeAPP0();
        writeCOM(image.comments);
        writeAPP1(image.exifBuffer);
        writeDQT();
        writeSOF0(image.width, image.height);
        writeDHT();
        writeSOS();
        var DCY = 0;
        var DCU = 0;
        var DCV = 0;
        bytenew = 0;
        bytepos = 7;
        this.encode.displayName = "_encode_";
        var imageData = image.data;
        var width = image.width;
        var height = image.height;
        var quadWidth = width * 4;
        var tripleWidth = width * 3;
        var x, y = 0;
        var r, g, b;
        var start, p, col, row, pos;
        while (y < height) {
          x = 0;
          while (x < quadWidth) {
            start = quadWidth * y + x;
            p = start;
            col = -1;
            row = 0;
            for (pos = 0; pos < 64; pos++) {
              row = pos >> 3;
              col = (pos & 7) * 4;
              p = start + row * quadWidth + col;
              if (y + row >= height) {
                p -= quadWidth * (y + 1 + row - height);
              }
              if (x + col >= quadWidth) {
                p -= x + col - quadWidth + 4;
              }
              r = imageData[p++];
              g = imageData[p++];
              b = imageData[p++];
              YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
              UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
              VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
            }
            DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
            DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
            DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
            x += 32;
          }
          y += 8;
        }
        if (bytepos >= 0) {
          var fillbits = [];
          fillbits[1] = bytepos + 1;
          fillbits[0] = (1 << bytepos + 1) - 1;
          writeBits(fillbits);
        }
        writeWord(65497);
        if (typeof module === "undefined") return new Uint8Array(byteout);
        return Buffer.from(byteout);
        var jpegDataUri = "data:image/jpeg;base64," + btoa(byteout.join(""));
        byteout = [];
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
        return jpegDataUri;
      };
      function setQuality(quality2) {
        if (quality2 <= 0) {
          quality2 = 1;
        }
        if (quality2 > 100) {
          quality2 = 100;
        }
        if (currentQuality == quality2) return;
        var sf = 0;
        if (quality2 < 50) {
          sf = Math.floor(5e3 / quality2);
        } else {
          sf = Math.floor(200 - quality2 * 2);
        }
        initQuantTables(sf);
        currentQuality = quality2;
      }
      function init() {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (!quality) quality = 50;
        initCharLookupTable();
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();
        setQuality(quality);
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
      }
      init();
    }
    if (typeof module !== "undefined") {
      module.exports = encode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].encode = encode;
    }
    function encode(imgData, qu) {
      if (typeof qu === "undefined") qu = 50;
      var encoder = new JPEGEncoder(qu);
      var data = encoder.encode(imgData, qu);
      return {
        data,
        width: imgData.width,
        height: imgData.height
      };
    }
  }
});

// server-access/node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "server-access/node_modules/jpeg-js/lib/decoder.js"(exports, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array([
        0,
        1,
        8,
        16,
        9,
        2,
        3,
        10,
        17,
        24,
        32,
        25,
        18,
        11,
        4,
        5,
        12,
        19,
        26,
        33,
        40,
        48,
        41,
        34,
        27,
        20,
        13,
        6,
        7,
        14,
        21,
        28,
        35,
        42,
        49,
        56,
        57,
        50,
        43,
        36,
        29,
        22,
        15,
        23,
        30,
        37,
        44,
        51,
        58,
        59,
        52,
        45,
        38,
        31,
        39,
        46,
        53,
        60,
        61,
        54,
        47,
        55,
        62,
        63
      ]);
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i, j, length = 16;
        while (length > 0 && !codeLengths[length - 1])
          length--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i = 0; i < length; i++) {
          for (j = 0; j < codeLengths[i]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i + 1 < length) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame.precision;
        var samplesPerLine = frame.samplesPerLine;
        var scanLines = frame.scanLines;
        var mcusPerLine = frame.mcusPerLine;
        var progressive = frame.progressive;
        var maxH = frame.maxH, maxV = frame.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length) {
          var n2 = 0;
          while (length > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length--;
          }
          return n2;
        }
        function receiveAndExtend(length) {
          var n2 = receive(length);
          if (n2 >= 1 << length - 1)
            return n2;
          return n2 + (-1 << length) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode2, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode2, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i = 0; i < componentsLength; i++)
            components[i].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i = 0; i < componentsLength; i++) {
                component = components[i];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame, component) {
        var lines = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i2;
          for (i2 = 0; i2 < 64; i2++)
            p[i2] = zz[i2] * qt[i2];
          for (i2 = 0; i2 < 8; ++i2) {
            var row = 8 * i2;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i2 = 0; i2 < 8; ++i2) {
            var col = i2;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i2 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i2 = 0; i2 < 64; ++i2) {
            var sample2 = 128 + (p[i2] + 8 >> 4);
            dataOut[i2] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i = 0; i < 8; i++)
            lines.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines[scanLine + j];
              for (i = 0; i < 8; i++)
                line[sample + i] = r[offset++];
            }
          }
        }
        return lines;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length2 = readUint16();
            var array = data.subarray(offset, offset + length2 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame2) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV2);
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i2 = 0; i2 < blocksPerColumnForMcu; i2++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame2.maxH = maxH2;
            frame2.maxV = maxV2;
            frame2.mcusPerLine = mcusPerLine;
            frame2.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame = {};
                frame.extended = fileMarker === 65473;
                frame.progressive = fileMarker === 65474;
                frame.precision = data[offset++];
                frame.scanLines = readUint16();
                frame.samplesPerLine = readUint16();
                frame.components = {};
                frame.componentsOrder = [];
                var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i = 0; i < componentsCount; i++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame.componentsOrder.push(componentId);
                  frame.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame);
                frames.push(frame);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i = 2; i < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i = 0; i < selectorsCount; i++) {
                  component = frame.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i = 0; i < frames.length; i++) {
            var cp = frames[i].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame.samplesPerLine;
          this.height = frame.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i = 0; i < frame.componentsOrder.length; i++) {
            var component = frame.components[frame.componentsOrder[i]];
            this.components.push({
              lines: buildComponentData(frame, component),
              scaleX: component.h / frame.maxH,
              scaleY: component.v / frame.maxV
            });
          }
        },
        getData: function getData(width, height) {
          var scaleX = this.width / width, scaleY = this.height / height;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x * component1.scaleX * scaleX];
                    G = component2Line[0 | x * component2.scaleX * scaleX];
                    B = component3Line[0 | x * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x * component1.scaleX * scaleX];
                    M = component2Line[0 | x * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height);
          var i = 0, j = 0, x, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  Y = data[i++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  R = data[i++];
                  G = data[i++];
                  B = data[i++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  C = data[i++];
                  M = data[i++];
                  Y = data[i++];
                  K = data[i++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].decode = decode;
    }
    function decode(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err) {
        if (err instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err instanceof ReferenceError) {
          if (err.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});

// server-access/node_modules/jpeg-js/index.js
var require_jpeg_js = __commonJS({
  "server-access/node_modules/jpeg-js/index.js"(exports, module) {
    var encode = require_encoder();
    var decode = require_decoder();
    module.exports = {
      encode,
      decode
    };
  }
});

// server-access/bff/server.mjs
import http from "node:http";

// server-access/bff/account-read.mjs
import { createHash, createHmac, randomBytes, timingSafeEqual as timingSafeEqual2 } from "node:crypto";

// server-access/bff/gateway-cookie-context.mjs
import { timingSafeEqual } from "node:crypto";
var CONTEXT_HEADER = "x-yc-apigateway-operation-context";
var PROTECTED = /* @__PURE__ */ new Set(["__Host-nexus_session", "__Host-nexus_passkey_flow", "__Host-nexus_oauth_flow", "__Host-nexus_probe"]);
var SYNTHETIC_CONTEXTS = /* @__PURE__ */ new Map();
var syntheticS = "__Host-nexus_session=nxs_" + "A".repeat(43);
var syntheticF = "__Host-nexus_oauth_flow=nof_" + "B".repeat(43);
var syntheticP = "__Host-nexus_passkey_flow=npf_" + "C".repeat(43);
for (const [name, pairs] of [["S", [syntheticS]], ["F", [syntheticF]], ["P", [syntheticP]], ["SPF", [syntheticS, syntheticP, syntheticF]]]) SYNTHETIC_CONTEXTS.set(pairs.sort().join("; "), "v2_cookie_mismatch_expected_" + name);
var reject = (reason) => {
  const error2 = Error("INGRESS_REJECTED");
  error2.cookieContextReason = reason;
  throw error2;
};
function count(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return reject("v2_raw_headers");
  let total = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string" || typeof req.rawHeaders[i + 1] !== "string") return reject("v2_raw_headers");
    if (req.rawHeaders[i].toLowerCase() === name) total++;
  }
  return total;
}
function parseCookies(raw, syntaxReason, duplicateReason = "v2_protected_duplicate") {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096 || !/^[\x09\x20-\x7e]+$/.test(raw)) return reject(syntaxReason);
  const values = /* @__PURE__ */ new Map(), pairs = [];
  for (const part of raw.split(";")) {
    const pair = part.trim(), at = pair.indexOf("=");
    if (at < 1) return reject(syntaxReason);
    const name = pair.slice(0, at), value = pair.slice(at + 1);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) return reject(syntaxReason);
    if (PROTECTED.has(name) && values.has(name)) return reject(duplicateReason);
    values.set(name, value);
    pairs.push(name + "=" + value);
  }
  return { values, canonical: pairs.sort().join("; ") };
}
function readV2CookieContext(req, marker, { env = {} } = {}) {
  if (typeof marker !== "string" || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(marker) || marker === "cookieHeader") return reject("v2_marker_argument");
  if (count(req, CONTEXT_HEADER) !== 1) return reject("v2_context_count");
  const raw = req.headers?.[CONTEXT_HEADER];
  if (typeof raw !== "string" || !raw.length || raw.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return reject("v2_context_base64");
  let text4, data;
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length > 6144 || bytes.toString("base64") !== raw) return reject("v2_context_base64");
  try {
    text4 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return reject("v2_context_utf8");
  }
  try {
    data = JSON.parse(text4);
  } catch {
    return reject("v2_context_json");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return reject("v2_context_shape");
  if (data[marker] === "v1") return void 0;
  if (data[marker] === "v3") {
    if (env.COOKIE_INGRESS_V3_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") return reject("v3_disabled");
    if (Object.keys(data).length !== 1 || !Object.hasOwn(data, marker) || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 2) return reject("v3_context_shape");
    const rawContext = req.rawHeaders.filter((_, i) => i % 2 === 1 && req.rawHeaders[i - 1].toLowerCase() === CONTEXT_HEADER);
    if (rawContext[0] !== raw) return reject("v3_header_inconsistent");
    const actual2 = req.headers?.cookie, present2 = actual2 !== void 0, cookieCount2 = count(req, "cookie");
    if (!present2) {
      if (cookieCount2 !== 0) return reject("v3_cookie_header_count");
      return /* @__PURE__ */ new Map();
    }
    if (cookieCount2 !== 1 || typeof actual2 !== "string") return reject("v3_cookie_header_count");
    const rawCookie = req.rawHeaders.filter((_, i) => i % 2 === 1 && req.rawHeaders[i - 1].toLowerCase() === "cookie");
    if (rawCookie[0] !== actual2) return reject("v3_header_inconsistent");
    if (!/^[\x20-\x7e]+$/.test(actual2)) return reject("v3_raw_cookie_syntax");
    return parseCookies(actual2, "v3_raw_cookie_syntax", "v3_protected_duplicate").values;
  }
  if (data[marker] !== "v2" || Object.keys(data).sort().join(",") !== [marker, "cookieHeader"].sort().join(",") || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 4 || typeof data.cookieHeader !== "string") return reject("v2_context_shape");
  const actual = req.headers?.cookie, present = actual !== void 0, cookieCount = count(req, "cookie");
  if (!present && cookieCount !== 0 || present && (cookieCount !== 1 || typeof actual !== "string")) return reject("v2_cookie_header_count");
  if (data.cookieHeader === "-") {
    if (present) return reject("v2_absent_context");
    return /* @__PURE__ */ new Map();
  }
  if (!present) return reject("v2_absent_raw");
  const expected = parseCookies(data.cookieHeader, "v2_context_cookie_syntax"), received = parseCookies(actual, "v2_raw_cookie_syntax");
  const left = Buffer.from(expected.canonical, "ascii"), right = Buffer.from(received.canonical, "ascii");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return reject(SYNTHETIC_CONTEXTS.get(expected.canonical) ?? "v2_cookie_mismatch_expected_OTHER");
  return received.values;
}

// server-access/bff/account-read.mjs
var WORKER_ORIGIN = "https://akronikl-nexus-sync.akronikl.workers.dev";
var GATEWAY_ORIGIN = "https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net";
var PATHS = /* @__PURE__ */ new Set(["/api/v2/account", "/api/v2/account/login-methods"]);
var INTERNAL_PATH = "/api/v2/account/internal/read";
var MAX_RESPONSE_BYTES = 65536;
function reply(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store",
    "Vary": "*",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(data);
}
function headerCount(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count5 = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count5++;
  }
  return count5;
}
function sessionFromContext(req) {
  if (headerCount(req, "x-yc-apigateway-operation-context") !== 1) return null;
  const raw = req.headers["x-yc-apigateway-operation-context"];
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return null;
  try {
    const bytes = Buffer.from(raw, "base64");
    if (bytes.toString("base64") !== raw) return null;
    const decoded = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    const context2 = JSON.parse(decoded);
    if (!context2 || typeof context2 !== "object" || Array.isArray(context2) || Object.keys(context2).length !== 2 || !Object.hasOwn(context2, "accountReadContract") || !Object.hasOwn(context2, "sessionCookie")) return null;
    if (context2.accountReadContract !== "v1" || typeof context2.sessionCookie !== "string" || !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(context2.sessionCookie)) return null;
    const strings = decoded.match(/"(?:[^"\\]|\\.)*"/g);
    if (strings?.length !== 4) return null;
    return context2.sessionCookie;
  } catch {
    return null;
  }
}
function sessionFromCookie(req) {
  if (headerCount(req, "cookie") !== 1) return null;
  const raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let session = null;
  for (const part of raw.split(";")) {
    const pair = part.trim();
    const equals = pair.indexOf("=");
    if (equals <= 0) return null;
    const name = pair.slice(0, equals);
    const value = pair.slice(equals + 1);
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) return null;
    if (name !== "__Host-nexus_session") continue;
    if (session !== null) return null;
    if (!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(value)) return null;
    session = value;
  }
  return session;
}
function sessionFromIngress(req, options = {}) {
  try {
    const cookies2 = readV2CookieContext(req, "accountReadContract", options);
    if (cookies2 !== void 0) {
      const session = cookies2.get("__Host-nexus_session");
      return typeof session === "string" && /^nxs_[A-Za-z0-9_-]{24,256}$/.test(session) ? session : null;
    }
  } catch {
    return null;
  }
  const context2 = sessionFromContext(req);
  if (!context2) return null;
  if (req.headers.cookie === void 0) {
    return headerCount(req, "cookie") === 0 ? context2 : null;
  }
  const cookie = sessionFromCookie(req);
  if (!cookie) return null;
  const expected = Buffer.from(context2);
  const received = Buffer.from(cookie);
  if (expected.length !== received.length || !timingSafeEqual2(expected, received)) return null;
  return context2;
}
async function boundedJson(response) {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    await response.body?.cancel();
    throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("\u041F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442");
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u043E\u0442\u0432\u0435\u0442");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error2) {
    await reader.cancel().catch(() => {
    });
    throw error2;
  } finally {
    reader.releaseLock();
  }
}
function text(value, max) {
  if (typeof value !== "string" || value.length > max) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
  return value;
}
function safeDto(body, path) {
  if (body?.enrollmentAvailable !== false || !Array.isArray(body.loginMethods) || body.loginMethods.length > 100) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
  const loginMethods = body.loginMethods.map((method) => {
    if (!["oauth", "password", "passkey"].includes(method.kind) || !["pending", "active", "disabled"].includes(method.status)) throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
    return {
      id: text(method.id, 256),
      kind: method.kind,
      status: method.status,
      createdAt: text(method.createdAt, 64),
      disabledAt: method.disabledAt === null ? null : text(method.disabledAt, 64)
    };
  });
  const dto = { loginMethods, enrollmentAvailable: false };
  if (path === "/api/v2/account") {
    if (body.account?.status !== "active") throw new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 DTO");
    dto.account = {
      accountId: text(body.account.accountId, 256),
      displayName: text(body.account.displayName, 512),
      status: "active"
    };
  }
  return dto;
}
function createAccountReadHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (!PATHS.has(req.url) || env.ACCOUNT_READ_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") {
      return reply(res, 404, { error: { code: "NOT_FOUND" } });
    }
    if (req.method !== "GET") return reply(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const host = new URL(GATEWAY_ORIGIN).host;
    if (req.headers.host !== host || req.headers.origin && req.headers.origin !== GATEWAY_ORIGIN || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") {
      return reply(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    }
    if (req.headers.authorization) return reply(res, 403, { error: { code: "BROWSER_BEARER_REJECTED" } });
    const session = sessionFromIngress(req, { env });
    if (!session) return reply(res, 401, { error: { code: "SESSION_REQUIRED" } });
    const serviceKey = env.ACCOUNT_SERVICE_KEY;
    if (typeof serviceKey !== "string" || serviceKey.length < 32) {
      return reply(res, 404, { error: { code: "ACCOUNT_SERVICE_DISABLED" } });
    }
    try {
      const body = JSON.stringify({ path: req.url, sessionHash: createHash("sha256").update(session).digest("hex") });
      const stamp = String(Date.now());
      const nonce = randomBytes(16).toString("hex");
      const bodyHash = createHash("sha256").update(body).digest("hex");
      const canonical = `v1
POST
${INTERNAL_PATH}
${stamp}
${nonce}
${bodyHash}`;
      const signature = createHmac("sha256", serviceKey).update(canonical).digest("hex");
      const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH, {
        method: "POST",
        body,
        redirect: "error",
        signal: AbortSignal.timeout(5e3),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-nexus-service-timestamp": stamp,
          "x-nexus-service-nonce": nonce,
          "x-nexus-service-signature": signature
        }
      });
      if (upstream.status !== 200) {
        await upstream.body?.cancel();
        if (upstream.status === 401) return reply(res, 401, { error: { code: "SESSION_REJECTED" } });
        if (upstream.status === 403) return reply(res, 403, { error: { code: "ACCESS_DENIED" } });
        return reply(res, 502, { error: { code: "ACCOUNT_UPSTREAM_UNAVAILABLE" } });
      }
      return reply(res, 200, safeDto(await boundedJson(upstream), req.url));
    } catch {
      return reply(res, 502, { error: { code: "ACCOUNT_UPSTREAM_UNAVAILABLE" } });
    }
  };
}

// core/content-contract.js
var HOME_SLOTS = {
  title: { label: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F: \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A", selector: "#visualHomeTitle", max: 160 },
  intro: { label: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F: \u0432\u0432\u043E\u0434\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442", selector: ".visual-home-copy > p", max: 1200 },
  choose: { label: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F: \u043E\u0441\u043D\u043E\u0432\u043D\u0430\u044F \u043A\u043D\u043E\u043F\u043A\u0430", selector: ".visual-home-copy .visual-actions > a:first-child", max: 80 },
  note: { label: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F: \u043F\u0440\u0438\u043C\u0435\u0447\u0430\u043D\u0438\u0435", selector: ".visual-home-note", max: 300 },
  journeyTitle: { label: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F: \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043A\u0430\u0440\u0442\u044B \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F", selector: "#visualJourneyTitle", max: 160 }
};

// core/private-response-policy.js
function hasVaryWildcard(value) {
  if (typeof value !== "string" || value.length > 4096) return false;
  const fields = value.split(",").map((field) => field.trim());
  return fields.length <= 64 && fields.includes("*") && fields.every((field) => /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(field));
}

// server-access/bff/content.mjs
var PATH = "/api/v2/content/feed";
function createContentHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (!req.url?.startsWith("/api/v2/content/")) return false;
    const reply8 = (status, data) => {
      const body = JSON.stringify(data);
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "cache-control": "no-store", vary: "*", "x-content-type-options": "nosniff" });
      res.end(body);
      return true;
    };
    try {
      if (env.CONTENT_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") return reply8(503, { error: { code: "CONTENT_UNAVAILABLE" } });
      const url = new URL(req.url, GATEWAY_ORIGIN);
      if (req.method !== "GET" || url.pathname !== PATH || req.url.split("?")[0] !== PATH || req.headers.host !== new URL(GATEWAY_ORIGIN).host) return reply8(404, { error: { code: "NOT_FOUND" } });
      if ([...url.searchParams.keys()].some((k) => k !== "slug") || url.searchParams.getAll("slug").length > 1) return reply8(400, { error: { code: "INVALID_INPUT" } });
      const response = await fetchImpl(WORKER_ORIGIN + req.url, { method: "GET", credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json" } });
      if (!response.headers.get("content-type")?.startsWith("application/json") || response.headers.has("set-cookie") || response.headers.get("cache-control") !== "no-store" || !hasVaryWildcard(response.headers.get("vary"))) throw Error();
      const reader = response.body.getReader(), chunks = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 131072) throw Error();
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {
        });
        reader.releaseLock();
      }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (response.status !== 200) return reply8([400, 404, 503].includes(response.status) ? response.status : 502, { error: { code: "CONTENT_UNAVAILABLE" } });
      const keys = (o, list) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === list.sort().join(",");
      if (!keys(data, ["home", "posts"]) || !data.home || typeof data.home !== "object" || Array.isArray(data.home) || Object.entries(data.home).some(([k, v]) => !Object.hasOwn(HOME_SLOTS, k) || typeof v !== "string" || v.length > HOME_SLOTS[k].max) || !Array.isArray(data.posts) || data.posts.length > 20) throw Error();
      for (const p of data.posts) if (!keys(p, url.searchParams.has("slug") ? ["slug", "title", "summary", "body", "publishedAt"] : ["slug", "title", "summary", "publishedAt"]) || typeof p.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || typeof p.title !== "string" || p.title.length > 160 || typeof p.summary !== "string" || p.summary.length > 500 || typeof p.publishedAt !== "string" || p.publishedAt.length > 64 || p.body !== void 0 && (typeof p.body !== "string" || p.body.length > 2e4)) throw Error();
      return reply8(200, data);
    } catch {
      return reply8(502, { error: { code: "CONTENT_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/server.mjs
import { readFileSync } from "node:fs";

// server-access/bff/passkey.mjs
import { createHash as createHash2, createHmac as createHmac2, randomBytes as randomBytes2 } from "node:crypto";
import { isIP } from "node:net";
var INTERNAL = "/api/v2/account/internal/passkey";
var routes = /* @__PURE__ */ new Map([
  ["/api/v2/account/passkey/registration", ["GET", "registration-policy"]],
  ["/api/v2/account/passkey/register/cancel", ["POST", "cancel-public-registration"]],
  ["/api/v2/account/passkey/invitation", ["POST", "invitation-info"]],
  ["/api/v2/account/passkey/register/options", ["POST", "register-options"]],
  ["/api/v2/account/passkey/register/verify", ["POST", "register-verify"]],
  ["/api/v2/account/passkey/authenticate/options", ["POST", "authenticate-options"]],
  ["/api/v2/account/passkey/authenticate/verify", ["POST", "authenticate-verify"]],
  ["/api/v2/account/passkey/keys", ["GET", "keys"]],
  ["/api/v2/account/passkey/revoke", ["POST", "revoke"]],
  ["/api/v2/account/passkey/logout", ["POST", "logout"]]
]);
var digest = (value) => createHash2("sha256").update(value).digest("hex");
var reply2 = (res, status, body, cookies2 = []) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data), ...cookies2.length ? { "set-cookie": cookies2 } : {} });
  res.end(data);
};
var count2 = (req, name) => {
  let value = 0;
  for (let i = 0; i < (req.rawHeaders || []).length; i += 2) if (req.rawHeaders[i].toLowerCase() === name) value++;
  return value;
};
var cookies = (name, value, age) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
function context(req, env) {
  const v2 = readV2CookieContext(req, "passkeyIngressContract", { env });
  if (v2 !== void 0) {
    const flow2 = v2.get("__Host-nexus_passkey_flow") ?? null, session2 = v2.get("__Host-nexus_session") ?? null;
    if (flow2 !== null && !/^npf_[A-Za-z0-9_-]{43}$/.test(flow2) || session2 !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session2)) throw Error("INGRESS_REJECTED");
    return { flow: flow2, session: session2 };
  }
  if (count2(req, "x-yc-apigateway-operation-context") !== 1) throw Error("INGRESS_REJECTED");
  const value = req.headers["x-yc-apigateway-operation-context"];
  if (typeof value !== "string" || value.length > 4096 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error("INGRESS_REJECTED");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw Error("INGRESS_REJECTED");
  const text4 = new TextDecoder("utf-8", { fatal: true }).decode(bytes), data = JSON.parse(text4);
  if (!data || Object.keys(data).sort().join(",") !== "flowCookie,passkeyIngressContract,sessionCookie" || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 6 || data.passkeyIngressContract !== "v1" || typeof data.flowCookie !== "string" || typeof data.sessionCookie !== "string") throw Error("INGRESS_REJECTED");
  const optional = (value2) => ["", "-"].includes(value2) ? null : value2;
  const flow = optional(data.flowCookie), session = optional(data.sessionCookie);
  if (flow && !/^npf_[A-Za-z0-9_-]{43}$/.test(flow) || session && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) throw Error("INGRESS_REJECTED");
  if (req.headers.cookie !== void 0) {
    if (count2(req, "cookie") !== 1 || typeof req.headers.cookie !== "string" || req.headers.cookie.length > 8192) throw Error("INGRESS_REJECTED");
    const found = {};
    for (const part of req.headers.cookie.split(";")) {
      const p = part.trim(), at = p.indexOf("=");
      if (at < 1) throw Error("INGRESS_REJECTED");
      const name = p.slice(0, at), v = p.slice(at + 1);
      if (!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name) || /[\s,;"\\]/.test(v)) throw Error("INGRESS_REJECTED");
      if (["__Host-nexus_session", "__Host-nexus_passkey_flow"].includes(name)) {
        if (name in found) throw Error("INGRESS_REJECTED");
        found[name] = v;
      }
    }
    if ((found["__Host-nexus_session"] || null) !== session || (found["__Host-nexus_passkey_flow"] || null) !== flow) throw Error("INGRESS_REJECTED");
  }
  return { flow, session };
}
async function readJSON(stream, max) {
  let size = 0;
  const parts = [];
  for await (const part of stream) {
    size += part.length;
    if (size > max) throw Error("INPUT_TOO_LARGE");
    parts.push(part);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
async function upstreamJSON(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("UPSTREAM_INVALID");
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) throw Error("UPSTREAM_INVALID");
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createPasskeyHandler({ env, fetchImpl = fetch }) {
  return async (req, res) => {
    const route = routes.get(req.url);
    if (!route) return reply2(res, 404, { error: { code: "NOT_FOUND" } });
    if (env.PASSKEY_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.PASSKEY_SERVICE_KEY !== "string" || env.PASSKEY_SERVICE_KEY.length < 32) return reply2(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    let origin, worker;
    try {
      origin = new URL(env.PASSKEY_ORIGIN);
      worker = new URL(env.PASSKEY_WORKER_ORIGIN);
    } catch {
      return reply2(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    }
    if (origin.origin !== env.PASSKEY_ORIGIN || worker.origin !== env.PASSKEY_WORKER_ORIGIN || worker.protocol !== "https:") return reply2(res, 503, { error: { code: "PASSKEY_UNAVAILABLE" } });
    const [method, op] = route;
    if (req.method !== method) return reply2(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    if (req.headers.host !== origin.host || count2(req, "host") !== 1 || req.headers.authorization || req.headers.origin && req.headers.origin !== origin.origin || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin") return reply2(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (method === "POST" && (req.headers.origin !== origin.origin || count2(req, "origin") !== 1 || req.headers["x-nexus-passkey-write"] !== "1" || req.headers["content-type"] !== "application/json")) return reply2(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    try {
      const ingress2 = context(req, env), isOptions = op.endsWith("-options");
      const flow = isOptions || !op.endsWith("-verify") && op !== "cancel-public-registration" ? "npf_" + randomBytes2(32).toString("base64url") : ingress2.flow;
      if (!flow) return reply2(res, 401, { error: { code: "FLOW_REQUIRED" } });
      const input = method === "GET" ? {} : await readJSON(req, 65536);
      if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("INVALID_INPUT");
      let mapped = input;
      if (op === "register-options" || op === "invitation-info") {
        if (Object.keys(input).some((k) => !["invitationToken", "username", "displayName", "registration"].includes(k))) throw Error("INVALID_INPUT");
        if ("registration" in input) {
          if (op !== "register-options" || input.registration !== "open" || "invitationToken" in input || Object.keys(input).sort().join(",") !== "displayName,registration,username" || typeof input.username !== "string" || typeof input.displayName !== "string") throw Error("INVALID_INPUT");
          mapped = { registration: "open", username: input.username, displayName: input.displayName };
        } else if (input.invitationToken !== void 0) {
          if (typeof input.invitationToken !== "string" || !/^npi_[A-Za-z0-9_-]{43}$/.test(input.invitationToken)) throw Error("INVALID_INPUT");
          mapped = { inviteHash: digest(input.invitationToken), ...input.username !== void 0 ? { username: input.username } : {}, ...input.displayName !== void 0 ? { displayName: input.displayName } : {} };
        } else {
          if (input.username !== void 0 || input.displayName !== void 0) throw Error("INVALID_INPUT");
          mapped = {};
        }
      }
      const sessionHash = ingress2.session ? digest(ingress2.session) : null;
      const forwarded = String(req.headers["x-forwarded-for"] || "").split(",").at(-1).trim();
      const networkHash = createHmac2("sha256", env.PASSKEY_SERVICE_KEY).update(isIP(forwarded) ? forwarded : String(req.socket?.remoteAddress || "unknown")).digest("hex");
      const body = JSON.stringify({ op, input: mapped, flowHash: digest(flow), sessionHash, networkHash }), timestamp = String(Date.now()), nonce = randomBytes2(16).toString("hex");
      const canonical = `v1
POST
${INTERNAL}
${timestamp}
${nonce}
${digest(body)}`;
      const upstream = await fetchImpl(worker.origin + INTERNAL, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(12e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": timestamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": createHmac2("sha256", env.PASSKEY_SERVICE_KEY).update(canonical).digest("hex") } });
      if (!upstream.headers.get("content-type")?.startsWith("application/json")) throw Error("UPSTREAM_INVALID");
      const data = await upstreamJSON(upstream);
      const safeCodes2 = ["REGISTRATION_CLOSED", "REGISTRATION_UNAVAILABLE", "ALREADY_SIGNED_IN", "ALPHA_CAPACITY_REACHED", "USERNAME_UNAVAILABLE", "PROFILE_INPUT_REQUIRED", "ALPHA_ACCESS_CLOSED", "ALPHA_CONTROL_UNAVAILABLE", "PASSKEY_UNAVAILABLE", "INVALID_INPUT", "INPUT_TOO_LARGE", "RATE_LIMITED", "ENROLLMENT_REQUIRED", "FRESH_LOGIN_REQUIRED", "KEY_LIMIT", "PASSKEY_REJECTED", "CHALLENGE_REJECTED", "SESSION_REQUIRED", "LAST_KEY_OR_NOT_FOUND", "ISSUANCE_UNCONFIRMED"];
      if (!upstream.ok) return reply2(res, [400, 401, 403, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502, { error: { code: safeCodes2.includes(data?.error?.code) ? data.error.code : "PASSKEY_UNAVAILABLE" } });
      if (op === "registration-policy") {
        if (Object.keys(data).sort().join(",") !== "available,reason" || typeof data.available !== "boolean" || !["open", "invitation", "capacity"].includes(data.reason) || data.available !== (data.reason === "open")) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { available: data.available, reason: data.reason });
      }
      if (op === "cancel-public-registration") {
        if (Object.keys(data).join(",") !== "ok" || data.ok !== true) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { ok: true }, [cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (isOptions) {
        if (typeof data.challengeId !== "string" || !data.options) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { challengeId: data.challengeId, options: data.options }, [cookies("__Host-nexus_passkey_flow", flow, 120)]);
      }
      if (op === "register-verify") {
        if (data.ok !== true || "sessionSecret" in data) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { ok: true }, [cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "authenticate-verify") {
        if (data.ok !== true || !/^nxs_[A-Za-z0-9_-]{43}$/.test(data.sessionSecret || "")) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { ok: true }, [cookies("__Host-nexus_session", data.sessionSecret, 43200), cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "logout") {
        if (data.ok !== true || data.clearSession !== true) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { ok: true }, [cookies("__Host-nexus_session", "", 0), cookies("__Host-nexus_passkey_flow", "", 0)]);
      }
      if (op === "keys") {
        if (!Array.isArray(data.keys) || data.keys.length > 10) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { keys: data.keys.map((k) => ({ id: k.id, status: k.status, createdAt: k.createdAt, deviceType: k.deviceType })) });
      }
      if (op === "invitation-info") {
        if (typeof data.profileRequired !== "boolean" || typeof data.expiresAt !== "string" || data.expiresAt.length > 64) throw Error("UPSTREAM_INVALID");
        return reply2(res, 200, { profileRequired: data.profileRequired, expiresAt: data.expiresAt });
      }
      if (op === "revoke" && data.ok === true) return reply2(res, 200, { ok: true });
      throw Error("UPSTREAM_INVALID");
    } catch (error2) {
      const code = ["INPUT_TOO_LARGE", "INVALID_INPUT", "INGRESS_REJECTED"].includes(error2.message) ? error2.message : error2 instanceof SyntaxError ? "INVALID_INPUT" : "PASSKEY_UNAVAILABLE";
      return reply2(res, code === "INPUT_TOO_LARGE" ? 413 : code === "INGRESS_REJECTED" ? 401 : code === "INVALID_INPUT" ? 400 : 502, { error: { code } });
    }
  };
}

// server-access/bff/feedback.mjs
import { createHash as createHash3, createHmac as createHmac3, randomBytes as randomBytes3 } from "node:crypto";
var INTERNAL2 = "/api/v2/feedback/internal";
var reply3 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "content-length": Buffer.byteLength(data) });
  res.end(data);
};
async function readBody(stream, max) {
  let length = 0;
  const chunks = [];
  for await (const part of stream) {
    length += part.length;
    if (length > max) throw Error("BODY_TOO_LARGE");
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function readResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error("EMPTY_RESPONSE");
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512e3) throw Error("RESPONSE_TOO_LARGE");
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createFeedbackHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (env.FEEDBACK_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true") return reply3(res, 503, { error: { code: "FEEDBACK_UNAVAILABLE" } });
    const origin = env.FEEDBACK_GATEWAY_ORIGIN || GATEWAY_ORIGIN, host = new URL(origin).host;
    if (req.headers.host !== host || req.headers.origin && req.headers.origin !== origin || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin" || req.headers.authorization) return reply3(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (!["GET", "POST", "PATCH"].includes(req.method)) return reply3(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const path = new URL(req.url, origin);
    if (path.pathname.includes("%") || !/^\/api\/v2\/feedback\/(reviews|me|items|moderation|items\/[a-zA-Z0-9-]+(?:\/(withdraw|moderate|events|delete|conversation|replies(?:\/[a-zA-Z0-9-]+\/delete)?))?)$/.test(path.pathname) || path.pathname !== req.url.split("?")[0]) return reply3(res, 404, { error: { code: "NOT_FOUND" } });
    if (req.method !== "GET" && (req.headers.origin !== origin || req.headers["x-nexus-feedback-write"] !== "1" || req.headers["content-type"] !== "application/json" || path.search)) return reply3(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    const isPublic = path.pathname === "/api/v2/feedback/reviews" && req.method === "GET";
    let session = null;
    if (!isPublic) {
      try {
        const v2 = readV2CookieContext(req, "accountReadContract", { env });
        session = v2 === void 0 ? sessionFromIngress(req, { env }) : v2.get("__Host-nexus_session") ?? null;
      } catch {
        return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
      }
      if (typeof session !== "string" || !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
    }
    const expectedAccountId = isPublic ? null : req.headers["x-nexus-feedback-account"];
    const expectationHeaders = Array.isArray(req.rawHeaders) ? req.rawHeaders.filter((name, index) => index % 2 === 0 && typeof name === "string" && name.toLowerCase() === "x-nexus-feedback-account").length : 0;
    const hasExpectation = !isPublic && (expectedAccountId !== void 0 || expectationHeaders > 0);
    if (!isPublic && (hasExpectation || env.FEEDBACK_ACCOUNT_EXPECTATION_REQUIRED === "true") && (expectationHeaders !== 1 || typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))) return reply3(res, 401, { error: { code: "SESSION_REQUIRED" } });
    try {
      let upstream;
      if (isPublic) {
        upstream = await fetchImpl(WORKER_ORIGIN + req.url, { method: "GET", redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json" } });
      } else {
        if (typeof env.FEEDBACK_SERVICE_KEY !== "string" || env.FEEDBACK_SERVICE_KEY.length < 32) return reply3(res, 503, { error: { code: "FEEDBACK_UNAVAILABLE" } });
        const payload = req.method === "GET" ? null : await readBody(req, 2e4), body = JSON.stringify({ method: req.method, path: req.url, payload, sessionHash: createHash3("sha256").update(session).digest("hex"), ...hasExpectation ? { expectedAccountId } : {} });
        const stamp = String(Date.now()), nonce = randomBytes3(16).toString("hex"), digest3 = createHash3("sha256").update(body).digest("hex"), canonical = `v1
POST
${INTERNAL2}
${stamp}
${nonce}
${digest3}`;
        upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL2, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(5e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": stamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": createHmac3("sha256", env.FEEDBACK_SERVICE_KEY).update(canonical).digest("hex") } });
      }
      if (!upstream.headers.get("content-type")?.startsWith("application/json")) throw Error("UPSTREAM_INVALID");
      const data = await readResponse(upstream);
      const allowedCodes = ["INVALID_INPUT", "INVALID_CONTEXT", "INPUT_TOO_LARGE", "RATE_LIMITED", "STALE_VERSION", "STALE_REVISION", "REQUEST_CONFLICT", "ITEM_DELETED", "INVALID_TRANSITION", "NOT_FOUND", "MODERATOR_REQUIRED", "SESSION_REQUIRED", "FEEDBACK_UNAVAILABLE"];
      if (!upstream.ok) return reply3(res, [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502, { error: { code: allowedCodes.includes(data?.error?.code) ? data.error.code : "FEEDBACK_UNAVAILABLE" } });
      return reply3(res, 200, data);
    } catch (error2) {
      return reply3(res, error2.message === "BODY_TOO_LARGE" ? 413 : error2 instanceof SyntaxError ? 400 : 502, { error: { code: error2.message === "BODY_TOO_LARGE" ? "INPUT_TOO_LARGE" : error2 instanceof SyntaxError ? "INVALID_INPUT" : "FEEDBACK_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/yc6-probe-handler.mjs
import { createHash as createHash4, randomBytes as randomBytes4, timingSafeEqual as timingSafeEqual3 } from "node:crypto";
var PROBE_COOKIE_NAME = "__Host-nexus_probe";
var PROBE_MAX_AGE_SECONDS = 300;
function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  res.end(payload);
}
function createProbeValue() {
  const nonce = randomBytes4(24).toString("base64url");
  const checksum = createHash4("sha256").update(`yc6:${nonce}`).digest("base64url").slice(0, 24);
  return `v1.${nonce}.${checksum}`;
}
function validateProbeValue(value) {
  if (typeof value !== "string") {
    return false;
  }
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return false;
  }
  const [, nonce, checksum] = parts;
  if (!nonce || !checksum) {
    return false;
  }
  const expectedChecksum = createHash4("sha256").update(`yc6:${nonce}`).digest("base64url").slice(0, 24);
  return checksum === expectedChecksum;
}
function decodeGatewayOperationContext(req) {
  const rawHeader = req.headers["x-yc-apigateway-operation-context"];
  if (typeof rawHeader !== "string" || rawHeader.length === 0) {
    return null;
  }
  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf8");
    const context2 = JSON.parse(decoded);
    return context2 && typeof context2 === "object" ? context2 : null;
  } catch {
    return null;
  }
}
function getProbeCookieFromGatewayContext(req) {
  const context2 = decodeGatewayOperationContext(req);
  if (!context2 || typeof context2.probeCookie !== "string") {
    return null;
  }
  return context2.probeCookie;
}
function getProbeCookieFromRawHeader(req) {
  const raw = req.headers.cookie;
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let value = null;
  for (const part of raw.split(";")) {
    const equals = part.indexOf("=");
    if (equals < 0 || part.slice(0, equals).trim() !== PROBE_COOKIE_NAME) continue;
    if (value !== null) return null;
    value = part.slice(equals + 1).trim();
  }
  return value;
}
function matchesGatewayContext(raw, context2) {
  if (typeof raw !== "string" || typeof context2 !== "string" || raw.length > 128 || context2.length > 128) return false;
  const actual = Buffer.from(raw);
  const expected = Buffer.from(context2);
  return actual.length === expected.length && timingSafeEqual3(actual, expected);
}
function probeCookieHeader(value) {
  return [
    `${PROBE_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${PROBE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
function clearProbeCookieHeader() {
  return [
    `${PROBE_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
function healthBody() {
  return {
    ok: true,
    service: "nexus-pilot-backend",
    platform: "yandex-serverless-container",
    stage: "yc-6-session-transport-probe",
    identityFoundation: true,
    sessionTransport: "controlled-probe",
    probeCookie: PROBE_COOKIE_NAME,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function handleProbeRequest(req, res) {
  const url = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );
  if (req.method === "GET" && (url.pathname === "/api/health" || url.pathname === "/health")) {
    return sendJson(res, 200, healthBody());
  }
  if (req.method === "POST" && url.pathname === "/api/session-probe/set") {
    const probeValue = createProbeValue();
    return sendJson(
      res,
      200,
      {
        ok: true,
        probe: "set",
        cookieIssued: true,
        cookieName: PROBE_COOKIE_NAME,
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        hostOnly: true,
        path: "/",
        maxAgeSeconds: PROBE_MAX_AGE_SECONDS
      },
      {
        "Set-Cookie": probeCookieHeader(probeValue)
      }
    );
  }
  if (req.method === "GET" && url.pathname === "/api/session-probe/read") {
    const probeValue = getProbeCookieFromRawHeader(req);
    const contextValue = getProbeCookieFromGatewayContext(req);
    const cookiePresent = typeof probeValue === "string" && probeValue.startsWith("v1.");
    const contextMatchesCookie = cookiePresent && matchesGatewayContext(probeValue, contextValue);
    const sessionResolved = contextMatchesCookie && validateProbeValue(probeValue);
    return sendJson(res, 200, {
      ok: true,
      probe: "read",
      cookiePresent,
      sessionResolved,
      contextMatchesCookie,
      transport: "gateway-operation-context"
    });
  }
  if (req.method === "POST" && url.pathname === "/api/session-probe/clear") {
    return sendJson(
      res,
      200,
      {
        ok: true,
        probe: "clear",
        cookieCleared: true
      },
      {
        "Set-Cookie": clearProbeCookieHeader()
      }
    );
  }
  return sendJson(res, 404, {
    ok: false,
    error: "NOT_FOUND",
    path: url.pathname
  });
}

// server-access/bff/routes.mjs
function createCombinedHandler(options) {
  const account = createAccountReadHandler(options);
  const feedback = createFeedbackHandler(options);
  return (req, res) => Promise.resolve().then(() => {
    if (req.url?.startsWith("/api/v2/feedback/")) return feedback(req, res);
    if (req.url?.startsWith("/api/v2/account")) return account(req, res);
    return handleProbeRequest(req, res);
  }).catch(() => {
    if (!res.headersSent) res.writeHead(500, { "Cache-Control": "no-store" });
    res.end();
  });
}

// server-access/bff/entry-gate.mjs
import { createHash as createHash5, createHmac as createHmac4, randomBytes as randomBytes5 } from "node:crypto";
var ENTRY_SHELL_URL = "https://qsqgjhngyt-maker.github.io/akronikl-it-nexus/nexus-shell.html";
var PATHS2 = /* @__PURE__ */ new Set(["/", "/index.html", "/nexus-shell.html"]);
var INTERNAL_PATH2 = "/api/v2/account/internal/read";
var MAX_ACCOUNT_BYTES = 65536;
var MAX_HTML_BYTES = 256 * 1024;
function headerCount2(req, name) {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let count5 = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) count5++;
  }
  return count5;
}
function reply4(req, res, status, body, contentType = "application/json; charset=utf-8", extra = {}) {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": data.length,
    "Cache-Control": "no-store",
    "Vary": "*",
    "X-Content-Type-Options": "nosniff",
    ...extra
  });
  res.end(req.method === "HEAD" ? void 0 : data);
  return true;
}
function error(req, res, status, code, extra) {
  return reply4(req, res, status, { error: { code } }, void 0, extra);
}
async function boundedBytes(response, max, type) {
  if (response.redirected || !type.test(response.headers.get("content-type") || "")) {
    await response.body?.cancel();
    throw Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
  }
  const declared = response.headers.get("content-length");
  const encoded = response.headers.get("content-encoding");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) {
    await response.body?.cancel();
    throw Error("\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0440\u0430\u0437\u043C\u0435\u0440 upstream");
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error("\u041F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) throw Error("\u041F\u0440\u0435\u0432\u044B\u0448\u0435\u043D \u0440\u0430\u0437\u043C\u0435\u0440 upstream");
      chunks.push(value);
    }
    if (!length || declared !== null && (!encoded || encoded.toLowerCase() === "identity") && Number(declared) !== length) throw Error("\u041D\u0435\u043F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 upstream");
    return Buffer.concat(chunks, length);
  } catch (failure) {
    await reader.cancel().catch(() => {
    });
    throw failure;
  } finally {
    reader.releaseLock();
  }
}
function exactKeys(value, names) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join(",") === [...names].sort().join(",");
}
function text2(value, max, nonempty = false) {
  return typeof value === "string" && value.length <= max && (!nonempty || value.length > 0);
}
function isActiveAccountDTO(body) {
  if (!exactKeys(body, ["account", "loginMethods", "enrollmentAvailable"]) || body.enrollmentAvailable !== false || !exactKeys(body.account, ["accountId", "displayName", "status"]) || body.account.status !== "active" || !text2(body.account.accountId, 256, true) || !text2(body.account.displayName, 512) || !Array.isArray(body.loginMethods) || body.loginMethods.length === 0 || body.loginMethods.length > 100) return false;
  const ids = /* @__PURE__ */ new Set();
  let active = false;
  for (const method of body.loginMethods) {
    if (!exactKeys(method, ["id", "kind", "status", "createdAt", "disabledAt"]) || !text2(method.id, 256, true) || ids.has(method.id) || !["oauth", "password", "passkey"].includes(method.kind) || !["pending", "active", "disabled"].includes(method.status) || !text2(method.createdAt, 64, true) || !(method.disabledAt === null || text2(method.disabledAt, 64, true))) return false;
    ids.add(method.id);
    if (method.status === "active" && method.disabledAt === null) active = true;
  }
  return active;
}
function createEntryGateHandler({ env = {}, fetchImpl = fetch, landingBody: landingBody2 } = {}) {
  const landing = Buffer.isBuffer(landingBody2) ? Buffer.from(landingBody2) : null;
  return async (req, res) => {
    if (env.NEXUS_ENTRY_GATE_ENABLED !== "true" || typeof req.url !== "string") return false;
    const path = req.url.split("?")[0];
    if (!PATHS2.has(path)) return false;
    if (req.url !== path) return error(req, res, 400, "ENTRY_TARGET_REJECTED");
    if (!["GET", "HEAD"].includes(req.method)) {
      return error(req, res, 405, "METHOD_NOT_ALLOWED", { Allow: "GET, HEAD" });
    }
    if (headerCount2(req, "host") !== 1 || req.headers.host !== new URL(GATEWAY_ORIGIN).host || req.headers.origin !== void 0 && req.headers.origin !== GATEWAY_ORIGIN) {
      return error(req, res, 403, "ORIGIN_REJECTED");
    }
    if (req.headers.authorization !== void 0 || headerCount2(req, "authorization") > 0) {
      return error(req, res, 403, "BROWSER_BEARER_REJECTED");
    }
    if (env.PRIVATE_GATEWAY_CONFIRMED !== "true" || env.ACCOUNT_READ_ENABLED !== "true" || typeof env.ACCOUNT_SERVICE_KEY !== "string" || env.ACCOUNT_SERVICE_KEY.length < 32 || !landing || !landing.length || landing.length > MAX_HTML_BYTES) {
      return error(req, res, 503, "ENTRY_GATE_UNAVAILABLE");
    }
    const publicOrDenied = (status, code) => path === "/nexus-shell.html" ? error(req, res, status, code) : reply4(req, res, 200, landing, "text/html; charset=utf-8");
    const session = sessionFromIngress(req, { env });
    if (!session) return publicOrDenied(401, "AUTHENTICATION_REQUIRED");
    try {
      const body = JSON.stringify({ path: "/api/v2/account", sessionHash: createHash5("sha256").update(session).digest("hex") });
      const stamp = String(Date.now());
      const nonce = randomBytes5(16).toString("hex");
      const hash = createHash5("sha256").update(body).digest("hex");
      const signature = createHmac4("sha256", env.ACCOUNT_SERVICE_KEY).update(`v1
POST
${INTERNAL_PATH2}
${stamp}
${nonce}
${hash}`).digest("hex");
      const account = await fetchImpl(WORKER_ORIGIN + INTERNAL_PATH2, {
        method: "POST",
        body,
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5e3),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-nexus-service-timestamp": stamp,
          "x-nexus-service-nonce": nonce,
          "x-nexus-service-signature": signature
        }
      });
      if (account.status !== 200) {
        await account.body?.cancel();
        if (account.status === 401 || account.status === 403) {
          return publicOrDenied(account.status, "SESSION_REJECTED");
        }
        return error(req, res, 502, "ENTRY_ACCOUNT_UNAVAILABLE");
      }
      const dto = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
        await boundedBytes(account, MAX_ACCOUNT_BYTES, /^application\/json(?:\s*;|$)/i)
      ));
      if (!isActiveAccountDTO(dto)) return error(req, res, 502, "ENTRY_ACCOUNT_INVALID");
      const shell = await fetchImpl(ENTRY_SHELL_URL, {
        method: "GET",
        headers: { accept: "text/html" },
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5e3)
      });
      if (shell.status !== 200) {
        await shell.body?.cancel();
        return error(req, res, 502, "ENTRY_SHELL_UNAVAILABLE");
      }
      const html = await boundedBytes(shell, MAX_HTML_BYTES, /^text\/html(?:\s*;|$)/i);
      return reply4(req, res, 200, html, "text/html; charset=utf-8");
    } catch {
      return error(req, res, 502, "ENTRY_UPSTREAM_UNAVAILABLE");
    }
  };
}

// server-access/bff/cloud-session.mjs
import { createHash as createHash6, createHmac as createHmac5, randomBytes as randomBytes6 } from "node:crypto";
var BASE = "/api/v2/cloud";
var INTERNAL3 = BASE + "/internal";
var MAX_REQUEST = 155e4;
var MAX_RESPONSE = 21e5;
var reply5 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "*",
    "x-content-type-options": "nosniff",
    "content-length": Buffer.byteLength(data)
  });
  res.end(data);
  return true;
};
function legacyPath(method, path) {
  if (typeof path !== "string" || path.length > 2048 || !path.startsWith(BASE + "/") || /[?#\\]/.test(path)) return null;
  const rest = path.slice(BASE.length);
  if (method === "GET" && (rest === "/me" || rest === "/projects")) return "/api/v1" + rest;
  const match = /^\/projects\/([^/]+)(\/audit)?$/.exec(rest);
  if (!match || !["GET", "PUT"].includes(method) || match[2] && method !== "GET") return null;
  try {
    const id2 = decodeURIComponent(match[1]);
    if (!id2 || id2.length > 256 || id2 === "." || id2 === ".." || /[/\\\u0000-\u001f\u007f]/.test(id2) || encodeURIComponent(id2) !== match[1]) return null;
    return "/api/v1" + rest;
  } catch {
    return null;
  }
}
async function readNodeBody(req, max) {
  let length = 0;
  const parts = [];
  for await (const part of req) {
    length += part.length;
    if (length > max) throw Error("INPUT_TOO_LARGE");
    parts.push(part);
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts)));
  } catch {
    throw Error("INVALID_INPUT");
  }
}
async function readResponse2(response) {
  const reader = response.body?.getReader();
  if (!reader) throw Error();
  let length = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE) throw Error();
      parts.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts));
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
function createCloudSessionHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (typeof req.url !== "string" || !req.url.startsWith(BASE + "/")) return false;
    if (env.CLOUD_SESSION_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.CLOUD_SERVICE_KEY !== "string" || env.CLOUD_SERVICE_KEY.length < 32)
      return reply5(res, 503, { error: { code: "CLOUD_UNAVAILABLE" } });
    if (req.headers.host !== new URL(GATEWAY_ORIGIN).host || req.headers.origin && req.headers.origin !== GATEWAY_ORIGIN || req.headers["sec-fetch-site"] && req.headers["sec-fetch-site"] !== "same-origin" || req.headers.authorization)
      return reply5(res, 403, { error: { code: "ORIGIN_REJECTED" } });
    if (!["GET", "PUT"].includes(req.method)) return reply5(res, 405, { error: { code: "METHOD_NOT_ALLOWED" } });
    const path = legacyPath(req.method, req.url);
    if (!path) return reply5(res, 404, { error: { code: "NOT_FOUND" } });
    if (req.method === "PUT" && (req.headers.origin !== GATEWAY_ORIGIN || req.headers["x-nexus-cloud-request"] !== "1" || req.headers["content-type"] !== "application/json"))
      return reply5(res, 403, { error: { code: "WRITE_ORIGIN_REQUIRED" } });
    const sessionCookie2 = sessionFromIngress(req, { env });
    if (!sessionCookie2) return reply5(res, 401, { error: { code: "SESSION_REQUIRED" } });
    const expectedAccountId = req.headers["x-nexus-cloud-account"];
    if (typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId))
      return reply5(res, 400, { error: { code: "ACCOUNT_EXPECTATION_REQUIRED" } });
    try {
      const payload = req.method === "GET" ? null : await readNodeBody(req, MAX_REQUEST);
      if (req.method === "PUT" && (!payload || typeof payload !== "object" || Array.isArray(payload)))
        return reply5(res, 400, { error: { code: "INVALID_INPUT" } });
      const body = JSON.stringify({ method: req.method, path, payload, sessionCookie: sessionCookie2, expectedAccountId });
      const stamp = String(Date.now()), nonce = randomBytes6(16).toString("hex");
      const digest3 = createHash6("sha256").update(body).digest("hex");
      const canonical = `v1
POST
${INTERNAL3}
${stamp}
${nonce}
${digest3}`;
      const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL3, {
        method: "POST",
        body,
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal: AbortSignal.timeout(8e3),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-nexus-service-timestamp": stamp,
          "x-nexus-service-nonce": nonce,
          "x-nexus-service-signature": createHmac5("sha256", env.CLOUD_SERVICE_KEY).update(canonical).digest("hex")
        }
      });
      if (!upstream.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw Error();
      const raw = await readResponse2(upstream);
      if (raw.includes(sessionCookie2) || raw.includes(env.CLOUD_SERVICE_KEY)) throw Error();
      const data = JSON.parse(raw);
      if (!upstream.ok) {
        const code = data?.error?.code;
        return reply5(
          res,
          [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502,
          { error: {
            code: typeof code === "string" && /^[A-Z_]{2,64}$/.test(code) ? code : "CLOUD_UNAVAILABLE",
            ...code === "REVISION_CONFLICT" ? { details: data.error.details } : {}
          } }
        );
      }
      return reply5(res, 200, data);
    } catch (error2) {
      const status = error2?.message === "INPUT_TOO_LARGE" ? 413 : error2?.message === "INVALID_INPUT" ? 400 : 502;
      return reply5(res, status, { error: { code: status === 413 ? "INPUT_TOO_LARGE" : status === 400 ? "INVALID_INPUT" : "CLOUD_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/oauth.mjs
import { createHash as createHash8, createHmac as createHmac6, randomBytes as randomBytes7, timingSafeEqual as timingSafeEqual5 } from "node:crypto";

// server-access/bff/oauth-providers.mjs
import { createHash as createHash7, createPublicKey, verify, timingSafeEqual as timingSafeEqual4 } from "node:crypto";
var PROVIDERS = Object.freeze({
  google: { label: "Google", prefix: "GOOGLE", authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token" },
  yandex: { label: "\u042F\u043D\u0434\u0435\u043A\u0441 ID", prefix: "YANDEX", authorize: "https://oauth.yandex.ru/authorize", token: "https://oauth.yandex.ru/token" },
  vk: { label: "VK ID", prefix: "VK", authorize: "https://id.vk.ru/authorize", token: "https://id.vk.ru/oauth2/auth" }
});
var ENDPOINTS = /* @__PURE__ */ new Set(["https://oauth2.googleapis.com/token", "https://www.googleapis.com/oauth2/v3/certs", "https://oauth.yandex.ru/token", "https://login.yandex.ru/info", "https://id.vk.ru/oauth2/auth", "https://id.vk.ru/oauth2/user_info"]);
var requireThat = (value) => {
  if (!value) throw Error("PROVIDER_REJECTED");
};
var safeSecret = (value) => typeof value === "string" && value.length > 0 && value.length <= 2048 && !/[\x00-\x20\x7f]/.test(value);
var equal = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual4(Buffer.from(a), Buffer.from(b));
var plain = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var text3 = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
var email = (value) => value === void 0 || value === null || value === "" ? null : (requireThat(text3(value, 320) && /^\S+@\S+\.\S+$/.test(value)), value.trim().toLowerCase());
var display = (value, fallback) => text3(value, 512) && value.trim() ? value.trim() : fallback;
var subject = (value) => {
  requireThat(text3(value, 512) && value === value.trim());
  return value;
};
var digest2 = (value) => createHash7("sha256").update(value).digest();
function authoritativeYandexEmail(user, address) {
  return typeof user.login === "string" && /^[a-z][a-z0-9.-]{0,63}$/.test(user.login) && address === user.login + "@yandex.ru";
}
var oauthCallbackURL = (provider) => {
  requireThat(Object.hasOwn(PROVIDERS, provider));
  return GATEWAY_ORIGIN + "/api/v2/account/oauth/" + provider + "/callback";
};
function configuration(env, provider) {
  const definition = PROVIDERS[provider];
  if (!definition) return null;
  const clientId = env[definition.prefix + "_CLIENT_ID"], clientSecret = env[definition.prefix + "_CLIENT_SECRET"];
  if (!safeSecret(clientId) || provider !== "vk" && !safeSecret(clientSecret)) return null;
  return { ...definition, clientId, clientSecret: provider === "vk" ? void 0 : clientSecret };
}
function configuredOAuthProviders(env = {}) {
  return Object.keys(PROVIDERS).filter((id2) => configuration(env, id2)).map((id2) => ({ id: id2, label: PROVIDERS[id2].label }));
}
function oauthAuthorizationURL({ provider, env, state, codeVerifier, nonce }) {
  const config = configuration(env, provider);
  requireThat(config);
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: oauthCallbackURL(provider),
    state,
    code_challenge: digest2(codeVerifier).toString("base64url"),
    code_challenge_method: provider === "vk" ? "s256" : "S256",
    scope: provider === "google" ? "openid email profile" : provider === "yandex" ? "login:info login:email" : "email",
    // Яндекс иначе может использовать прежнее согласие без выбора аккаунта.
    ...provider === "google" ? { nonce, prompt: "select_account" } : provider === "yandex" ? { force_confirm: "yes" } : {}
  }).toString();
  return url.href;
}
async function json(fetchImpl, url, options = {}) {
  const target = new URL(url);
  requireThat(target.protocol === "https:" && !target.username && !target.password && !target.hash && ENDPOINTS.has(target.origin + target.pathname));
  const response = await fetchImpl(target.href, { ...options, credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3e3) });
  if (response.status !== 200 || response.redirected || !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") || "")) {
    await response.body?.cancel();
    throw Error("PROVIDER_REJECTED");
  }
  const reader = response.body?.getReader();
  requireThat(reader);
  const parts = [];
  let length = 0;
  try {
    while (true) {
      const { done, value: value2 } = await reader.read();
      if (done) break;
      length += value2.length;
      requireThat(length <= 65536);
      parts.push(value2);
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts, length)));
    requireThat(plain(value) && !Object.hasOwn(value, "error"));
    return value;
  } finally {
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}
var formHeaders = { accept: "application/json", "content-type": "application/x-www-form-urlencoded" };
function validateToken(token) {
  requireThat(plain(token) && typeof token.access_token === "string" && token.access_token.length > 0 && token.access_token.length <= 8192 && !/[\x00-\x20\x7f]/.test(token.access_token) && typeof token.token_type === "string" && token.token_type.toLowerCase() === "bearer" && Number.isFinite(token.expires_in) && token.expires_in > 0);
}
function jwtJSON(segment) {
  requireThat(typeof segment === "string" && segment.length > 0 && /^[A-Za-z0-9_-]+$/.test(segment));
  const bytes = Buffer.from(segment, "base64url");
  requireThat(bytes.toString("base64url") === segment);
  const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  requireThat(plain(value));
  return value;
}
async function googleProfile(token, config, nonce, fetchImpl) {
  requireThat(typeof token.id_token === "string" && token.id_token.length <= 16384);
  const pieces = token.id_token.split(".");
  requireThat(pieces.length === 3);
  const header = jwtJSON(pieces[0]), claims = jwtJSON(pieces[1]);
  requireThat(header.alg === "RS256" && text3(header.kid, 128) && Object.keys(header).every((key2) => ["alg", "kid", "typ"].includes(key2)) && (header.typ === void 0 || header.typ === "JWT"));
  requireThat(/^[A-Za-z0-9_-]+$/.test(pieces[2]));
  const signature = Buffer.from(pieces[2], "base64url");
  requireThat(signature.toString("base64url") === pieces[2]);
  const jwks = await json(fetchImpl, "https://www.googleapis.com/oauth2/v3/certs", { method: "GET", headers: { accept: "application/json" } });
  requireThat(Array.isArray(jwks.keys) && jwks.keys.length > 0 && jwks.keys.length <= 20);
  const candidates = jwks.keys.filter((key2) => key2?.kid === header.kid);
  requireThat(candidates.length === 1);
  const jwk = candidates[0];
  requireThat(jwk.kty === "RSA" && (jwk.use === void 0 || jwk.use === "sig") && (jwk.alg === void 0 || jwk.alg === "RS256") && text3(jwk.n, 2048) && text3(jwk.e, 16) && !Object.hasOwn(jwk, "d"));
  const key = createPublicKey({ key: jwk, format: "jwk" }), bits = key.asymmetricKeyDetails?.modulusLength;
  requireThat(bits >= 2048 && bits <= 8192);
  requireThat(verify("RSA-SHA256", Buffer.from(pieces[0] + "." + pieces[1]), key, signature));
  const current = Math.floor(Date.now() / 1e3), aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  requireThat(["https://accounts.google.com", "accounts.google.com"].includes(claims.iss) && aud.length > 0 && aud.length <= 8 && aud.every((x) => typeof x === "string") && aud.includes(config.clientId));
  requireThat((claims.azp === void 0 || claims.azp === config.clientId) && (aud.length === 1 || claims.azp === config.clientId));
  requireThat(Number.isInteger(claims.exp) && claims.exp > current && Number.isInteger(claims.iat) && claims.iat <= current + 60 && claims.iat >= current - 600 && claims.exp > claims.iat && claims.exp - claims.iat <= 7200);
  requireThat(claims.nbf === void 0 || Number.isInteger(claims.nbf) && claims.nbf <= current + 60);
  requireThat(equal(claims.nonce, nonce) && typeof claims.sub === "string" && /^[\x21-\x7e]{1,255}$/.test(claims.sub));
  if (claims.at_hash !== void 0) requireThat(equal(claims.at_hash, digest2(token.access_token).subarray(0, 16).toString("base64url")));
  const address = email(claims.email), domain = address?.split("@").at(-1);
  const authoritative = domain === "gmail.com" || text3(claims.hd, 253) && claims.hd.toLowerCase() === domain;
  return { issuer: "https://accounts.google.com", subject: claims.sub, email: address, emailVerified: claims.email_verified === true && !!address && !!authoritative, displayName: display(claims.name, "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C Google") };
}
async function exchangeOAuthProfile({ provider, env, code, state, deviceId, codeVerifier, nonce, fetchImpl = fetch }) {
  const config = configuration(env, provider);
  requireThat(config);
  requireThat(text3(code, 4096) && text3(state, 128) && /^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier) && text3(nonce, 128));
  const body = new URLSearchParams({ grant_type: "authorization_code", code, client_id: config.clientId, redirect_uri: oauthCallbackURL(provider), code_verifier: codeVerifier, ...config.clientSecret ? { client_secret: config.clientSecret } : {} });
  let token;
  if (provider === "vk") {
    requireThat(text3(deviceId, 512));
    const target = new URL(config.token);
    target.search = new URLSearchParams({ grant_type: "authorization_code", redirect_uri: oauthCallbackURL(provider), client_id: config.clientId, code_verifier: codeVerifier, state, device_id: deviceId }).toString();
    token = await json(fetchImpl, target.href, { method: "POST", headers: formHeaders, body: new URLSearchParams({ code }).toString() });
  } else token = await json(fetchImpl, config.token, { method: "POST", headers: formHeaders, body: body.toString() });
  validateToken(token);
  if (provider === "google") return googleProfile(token, config, nonce, fetchImpl);
  if (provider === "yandex") {
    const user = await json(fetchImpl, "https://login.yandex.ru/info?format=json", { method: "GET", headers: { accept: "application/json", authorization: "OAuth " + token.access_token } });
    requireThat(user.client_id === config.clientId);
    const address = email(user.default_email);
    return { issuer: "https://login.yandex.ru", subject: subject(user.id), email: address, emailVerified: authoritativeYandexEmail(user, address), displayName: display(user.real_name || user.display_name || user.login, "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u042F\u043D\u0434\u0435\u043A\u0441") };
  }
  requireThat(equal(token.state, state));
  const tokenSubject = typeof token.user_id === "number" && Number.isSafeInteger(token.user_id) && token.user_id > 0 ? String(token.user_id) : subject(token.user_id);
  const userInfoURL = new URL("https://id.vk.ru/oauth2/user_info");
  userInfoURL.search = new URLSearchParams({ client_id: config.clientId }).toString();
  const data = await json(fetchImpl, userInfoURL.href, { method: "POST", headers: formHeaders, body: new URLSearchParams({ access_token: token.access_token }).toString() });
  requireThat(plain(data.user) && subject(data.user.user_id) === tokenSubject);
  return { issuer: "https://id.vk.ru", subject: tokenSubject, email: email(data.user.email), emailVerified: false, displayName: display([data.user.first_name, data.user.last_name].filter((x) => typeof x === "string").join(" "), "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C VK") };
}

// server-access/bff/oauth.mjs
var PREFIX = "/api/v2/account/oauth/";
var INTERNAL4 = "/api/v2/account/internal/oauth";
var sha = (value) => createHash8("sha256").update(value).digest("hex");
var random = () => randomBytes7(32).toString("base64url");
var count3 = (req, name) => {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2 !== 0) return -1;
  let total = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) total++;
  }
  return total;
};
var same = (a, b) => typeof a === "string" && typeof b === "string" && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual5(Buffer.from(a), Buffer.from(b));
var flowCookie = (value, age) => `__Host-nexus_oauth_flow=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
var sessionCookie = (value) => `__Host-nexus_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
var reply6 = (res, status, body, cookies2 = [], extra = {}) => {
  const data = body === null ? "" : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(data), "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...cookies2.length ? { "set-cookie": cookies2 } : {}, ...extra });
  res.end(data);
  return true;
};
function htmlCallbackError(req, res, status, code, cookies2) {
  if (typeof req.headers.accept !== "string" || !req.headers.accept.split(",").some((value) => /^text\/html(?:\s*;|$)/i.test(value.trim()) && !/;\s*q=0(?:\.0*)?(?:\s*;|\s*$)/i.test(value))) return false;
  const linking = code === "EXPLICIT_LINK_REQUIRED";
  const alpha = {
    ALPHA_ACCESS_CLOSED: ["\u0414\u043E\u0441\u0442\u0443\u043F \u043A \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044E \u0437\u0430\u043A\u0440\u044B\u0442", "\u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443 Nexus. \u0414\u0430\u043D\u043D\u044B\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F."],
    ALPHA_INVITATION_REQUIRED: ["\u0422\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u043E \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u044F\u043C", "\u0417\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u0435 \u0443 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0432\u0445\u043E\u0434\u0430."],
    ALPHA_CAPACITY_REACHED: ["\u0412\u0441\u0435 \u043C\u0435\u0441\u0442\u0430 \u0437\u0430\u043D\u044F\u0442\u044B", "\u0414\u043E\u0441\u0442\u0438\u0433\u043D\u0443\u0442 \u043B\u0438\u043C\u0438\u0442 \u0430\u043B\u044C\u0444\u0430-\u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0449\u0438\u043A\u043E\u0432. \u041E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443."]
  }[code];
  const title = alpha ? alpha[0] : linking ? "\u041F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430" : "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u0432\u0445\u043E\u0434";
  const message = alpha ? alpha[1] : linking ? "\u042D\u0442\u043E\u0442 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u0445\u043E\u0434\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D \u043A \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u043C\u0443 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0443. \u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u043E\u043C \u0438 \u043F\u0440\u0438\u0432\u044F\u0436\u0438\u0442\u0435 \u0435\u0433\u043E \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438 \u2014 \u043F\u0440\u043E\u0435\u043A\u0442\u044B \u0438 \u043F\u0440\u0430\u0432\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F." : "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434 \u0437\u0430\u043D\u043E\u0432\u043E. \u0415\u0441\u043B\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0435\u0442\u0441\u044F, \u0432\u043E\u0439\u0434\u0438\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u043C \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430.";
  const data = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} \xB7 Nexus</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#091321;color:#eaf4ff;font:17px/1.6 system-ui,sans-serif}main{box-sizing:border-box;max-width:680px;margin:24px;padding:clamp(24px,5vw,48px);border:1px solid #506278;border-radius:24px;background:#132033}small{color:#93ded7;letter-spacing:.12em}h1{font-size:clamp(25px,5vw,36px);line-height:1.2}p{color:#c5d2e3}nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:28px}a{color:#a8eee0;text-underline-offset:4px}a:first-child{padding:10px 16px;border:1px solid #7bcfc1;border-radius:12px}a:focus-visible{outline:3px solid #fff;outline-offset:4px}</style><main><small>AKRONIKL \xB7 IT NEXUS</small><h1>${title}</h1><p>${message}</p><nav><a href="${GATEWAY_ORIGIN}/account/access/">\u0412\u043E\u0439\u0442\u0438 \u043A\u043B\u044E\u0447\u043E\u043C \u0434\u043E\u0441\u0442\u0443\u043F\u0430</a>${linking ? `<a href="${GATEWAY_ORIGIN}/#view=account&amp;tab=security">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430</a>` : `<a href="${GATEWAY_ORIGIN}/account/entry/">\u041D\u0430\u0447\u0430\u0442\u044C \u0432\u0445\u043E\u0434 \u0437\u0430\u043D\u043E\u0432\u043E</a>`}</nav></main></html>`;
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "content-length": Buffer.byteLength(data), "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", ...cookies2.length ? { "set-cookie": cookies2 } : {} });
  res.end(data);
  return true;
}
var Rejected = class extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
};
var deny = (code, status) => {
  throw new Rejected(code, status);
};
var INGRESS_PROBE_REASONS = /* @__PURE__ */ new Set([
  "context_count",
  "base64",
  "utf8",
  "json",
  "shape",
  "shape_other",
  "session_format",
  "flow_format",
  "cookie_count",
  "syntax",
  "session_mismatch",
  "flow_mismatch",
  "v2_raw_headers",
  "v2_marker_argument",
  "v2_context_count",
  "v2_context_base64",
  "v2_context_utf8",
  "v2_context_json",
  "v2_context_shape",
  "v2_cookie_header_count",
  "v2_absent_context",
  "v2_absent_raw",
  "v2_context_cookie_syntax",
  "v2_raw_cookie_syntax",
  "v2_protected_duplicate",
  "v2_cookie_mismatch_expected_S",
  "v2_cookie_mismatch_expected_F",
  "v2_cookie_mismatch_expected_P",
  "v2_cookie_mismatch_expected_SPF",
  "v2_cookie_mismatch_expected_OTHER",
  "v2_rejected"
]);
var SYNTHETIC_COOKIE_PAIRS = /* @__PURE__ */ new Set([
  "__Host-nexus_session=nxs_" + "A".repeat(43),
  "__Host-nexus_oauth_flow=nof_" + "B".repeat(43),
  "__Host-nexus_passkey_flow=npf_" + "C".repeat(43)
]);
function syntheticIngressProbe(req) {
  if (count3(req, "x-nexus-transport-probe") !== 1 || req.headers["x-nexus-transport-probe"] !== "cookie-shape-v1" || typeof req.headers.cookie !== "string" || !req.headers.cookie || req.headers.cookie.length > 512) return false;
  const pairs = req.headers.cookie.split(";").map((value) => value.trim());
  return pairs.length > 0 && pairs.length <= 3 && new Set(pairs).size === pairs.length && pairs.every((value) => SYNTHETIC_COOKIE_PAIRS.has(value));
}
function ingress(req, env) {
  const fail2 = (reason) => {
    const error2 = new Rejected("INGRESS_REJECTED", 401);
    error2.probeReason = reason;
    throw error2;
  };
  if (count3(req, "x-yc-apigateway-operation-context") !== 1) fail2("context_count");
  const raw = req.headers["x-yc-apigateway-operation-context"];
  if (typeof raw !== "string" || raw.length > 8192 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail2("base64");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.toString("base64") !== raw) fail2("base64");
  let text4, data;
  try {
    text4 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail2("utf8");
  }
  try {
    data = JSON.parse(text4);
  } catch {
    fail2("json");
  }
  if (data?.oauthIngressContract === "v2" || data?.oauthIngressContract === "v3") {
    let v2;
    try {
      v2 = readV2CookieContext(req, "oauthIngressContract", { env });
    } catch (error2) {
      fail2(INGRESS_PROBE_REASONS.has(error2.cookieContextReason) ? error2.cookieContextReason : "v2_rejected");
    }
    if (v2 === void 0) deny("INGRESS_REJECTED", 401);
    const session2 = v2.get("__Host-nexus_session") ?? null, flow2 = v2.get("__Host-nexus_oauth_flow") ?? null;
    if (session2 !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session2)) fail2("session_format");
    if (flow2 !== null && !/^nof_[A-Za-z0-9_-]{43}$/.test(flow2)) fail2("flow_format");
    return { session: session2, flow: flow2 };
  }
  if (raw.length > 4096) fail2("base64");
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).sort().join(",") !== "oauthFlowCookie,oauthIngressContract,sessionCookie" || text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 6 || data.oauthIngressContract !== "v1" || typeof data.sessionCookie !== "string" || typeof data.oauthFlowCookie !== "string") fail2(data?.oauthIngressContract === "v1" ? "shape" : "shape_other");
  const optional = (value) => value === "-" ? null : value;
  const session = optional(data.sessionCookie), flow = optional(data.oauthFlowCookie);
  if (session !== null && !/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) fail2("session_format");
  if (flow !== null && !/^nof_[A-Za-z0-9_-]{43}$/.test(flow)) fail2("flow_format");
  if (req.headers.cookie !== void 0) {
    if (count3(req, "cookie") !== 1 || typeof req.headers.cookie !== "string" || req.headers.cookie.length > 8192) fail2("cookie_count");
    const found = {};
    for (const part of req.headers.cookie.split(";")) {
      const pair = part.trim(), at = pair.indexOf("=");
      if (at < 1) fail2("syntax");
      const name = pair.slice(0, at), value = pair.slice(at + 1);
      if (!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name) || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(value)) fail2("syntax");
      if (["__Host-nexus_session", "__Host-nexus_oauth_flow"].includes(name)) {
        if (Object.hasOwn(found, name)) fail2("syntax");
        found[name] = value;
      }
    }
    const fromCookie = found["__Host-nexus_session"] ?? null, fromFlow = found["__Host-nexus_oauth_flow"] ?? null;
    if (!(fromCookie === null && session === null) && !same(fromCookie, session)) fail2("session_mismatch");
    if (!(fromFlow === null && flow === null) && !same(fromFlow, flow)) fail2("flow_mismatch");
  } else if (count3(req, "cookie") !== 0) fail2("cookie_count");
  return { session, flow };
}
async function boundedJSON(source, max, flatIntent = false) {
  let length = 0;
  const parts = [];
  for await (const part of source) {
    const bytes = Buffer.from(part);
    length += bytes.length;
    if (length > max) deny("INPUT_TOO_LARGE", 413);
    parts.push(bytes);
  }
  let value;
  try {
    const text4 = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts, length));
    value = JSON.parse(text4);
    if (flatIntent && text4.match(/"(?:[^"\\]|\\.)*"/g)?.length !== 2) deny("INVALID_INPUT");
  } catch {
    deny("INVALID_INPUT");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) deny("INVALID_INPUT");
  return value;
}
async function service(env, fetchImpl, payload) {
  const body = JSON.stringify(payload), timestamp = String(Date.now()), nonce = randomBytes7(16).toString("hex");
  const signature = createHmac6("sha256", env.OAUTH_SERVICE_KEY).update(`v1
POST
${INTERNAL4}
${timestamp}
${nonce}
${sha(body)}`).digest("hex");
  const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL4, { method: "POST", credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(2500), body, headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": timestamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": signature } });
  if (upstream.redirected || !/^application\/json(?:\s*;|$)/i.test(upstream.headers.get("content-type") || "")) {
    await upstream.body?.cancel();
    deny("OAUTH_UNAVAILABLE", 502);
  }
  const data = await boundedJSON(upstream.body, 16384);
  if (upstream.status !== 200) {
    const safe = ["ALPHA_INVITATION_REQUIRED", "ALPHA_ACCESS_CLOSED", "ALPHA_CAPACITY_REACHED", "ALPHA_CONTROL_UNAVAILABLE", "ACCOUNT_SESSION_CHANGED", "FRESH_PASSKEY_REQUIRED", "EXPLICIT_LINK_REQUIRED", "OWNER_EMAIL_REQUIRED", "IDENTITY_ALREADY_LINKED", "IDENTITY_REJECTED", "TRANSACTION_REJECTED", "RATE_LIMITED"];
    deny(safe.includes(data.error?.code) ? data.error.code : "OAUTH_UNAVAILABLE", [400, 401, 403, 409, 429, 503].includes(upstream.status) ? upstream.status : 502);
  }
  if (data.ok !== true) deny("OAUTH_UNAVAILABLE", 502);
  return data;
}
function createOAuthHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (typeof req.url !== "string" || !req.url.startsWith(PREFIX)) return false;
    let callback = false;
    try {
      if (req.url.length > 8192) deny("INVALID_INPUT");
      const url = new URL(req.url, GATEWAY_ORIGIN), route = url.pathname.slice(PREFIX.length).split("/");
      callback = route.length === 2 && route[1] === "callback";
      if (req.url.split("?")[0] !== url.pathname || url.hash) deny("INVALID_INPUT");
      if (env.OAUTH_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.OAUTH_SERVICE_KEY !== "string" || env.OAUTH_SERVICE_KEY.length < 32) deny("OAUTH_UNAVAILABLE", 503);
      if (req.headers.host !== new URL(GATEWAY_ORIGIN).host || count3(req, "host") !== 1 || req.headers.authorization !== void 0 || count3(req, "authorization") > 0 || req.headers.origin !== void 0 && req.headers.origin !== GATEWAY_ORIGIN) deny("ORIGIN_REJECTED", 403);
      const providers = configuredOAuthProviders(env);
      if (req.url === PREFIX + "providers") {
        if (req.method !== "GET") deny("METHOD_NOT_ALLOWED", 405);
        return reply6(res, 200, { providers });
      }
      const [provider, action] = route;
      if (route.length !== 2 || !["start", "callback"].includes(action)) deny("NOT_FOUND", 404);
      if (!providers.some((item) => item.id === provider)) deny("OAUTH_PROVIDER_UNAVAILABLE", 503);
      if (req.method !== (action === "start" ? "POST" : "GET")) deny("METHOD_NOT_ALLOWED", 405);
      const context2 = ingress(req, env);
      if (action === "start") {
        if (url.search || req.url !== url.pathname) deny("INVALID_INPUT");
        if (req.headers.origin !== GATEWAY_ORIGIN || count3(req, "origin") !== 1 || req.headers["x-nexus-oauth-request"] !== "1" || count3(req, "x-nexus-oauth-request") !== 1 || req.headers["content-type"] !== "application/json" || req.headers["sec-fetch-site"] !== void 0 && req.headers["sec-fetch-site"] !== "same-origin") deny("WRITE_ORIGIN_REQUIRED", 403);
        const input = await boundedJSON(req, 1024, true);
        if (Object.keys(input).join(",") !== "intent" || !["login", "link"].includes(input.intent)) deny("INVALID_INPUT");
        const expectedAccountId = req.headers["x-nexus-oauth-account"], expectationHeaders = count3(req, "x-nexus-oauth-account");
        if (input.intent === "link") {
          if (expectationHeaders !== 1 || typeof expectedAccountId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(expectedAccountId)) deny("ACCOUNT_EXPECTATION_REQUIRED");
        } else if (expectedAccountId !== void 0 || expectationHeaders !== 0) deny("INVALID_INPUT");
        if (input.intent === "link" && !context2.session) deny("FRESH_PASSKEY_REQUIRED", 401);
        const state2 = random(), codeVerifier = random(), nonce = random(), flow = "nof_" + random();
        const result = await service(env, fetchImpl, { op: "begin", provider, intent: input.intent, stateHash: sha(state2), flowHash: sha(flow), codeVerifier, nonce, ...input.intent === "link" ? { sessionHash: sha(context2.session), expectedAccountId } : {} });
        if (typeof result.txId !== "string" || result.txId.length > 80 || typeof result.expiresAt !== "string") deny("OAUTH_UNAVAILABLE", 502);
        return reply6(res, 200, { authorizationURL: oauthAuthorizationURL({ provider, env, state: state2, codeVerifier, nonce }) }, [flowCookie(flow, 600)]);
      }
      if (!context2.flow) deny("FLOW_REQUIRED", 401);
      const params = url.searchParams;
      if ([...params.keys()].some((name) => params.getAll(name).length !== 1)) deny("INVALID_INPUT");
      const metadata = provider === "google" ? ["scope", "authuser", "prompt", "iss"] : provider === "vk" ? ["type", "expires_in"] : provider === "yandex" ? ["cid"] : [];
      if ([...params.keys()].some((name) => !["code", "state", ...provider === "vk" ? ["device_id"] : [], ...metadata].includes(name))) deny("INVALID_INPUT");
      if (params.has("cid") && !/^[A-Za-z0-9_-]{1,256}$/.test(params.get("cid") || "")) deny("INVALID_INPUT");
      const code = params.get("code"), state = params.get("state"), deviceId = params.get("device_id");
      if (typeof code !== "string" || !code.length || code.length > 4096 || /[\x00-\x20\x7f]/.test(code) || !/^[A-Za-z0-9_-]{43}$/.test(state || "") || provider === "vk" && (typeof deviceId !== "string" || !deviceId.length || deviceId.length > 512 || /[\x00-\x20\x7f]/.test(deviceId))) deny("INVALID_INPUT");
      if (params.has("iss") && !["https://accounts.google.com", "accounts.google.com"].includes(params.get("iss"))) deny("PROVIDER_REJECTED", 401);
      const claim = await service(env, fetchImpl, { op: "claim", provider, stateHash: sha(state), flowHash: sha(context2.flow) });
      if (typeof claim.txId !== "string" || claim.txId.length > 80 || !["login", "link"].includes(claim.intent) || typeof claim.codeVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(claim.codeVerifier) || typeof claim.nonce !== "string" || !/^[A-Za-z0-9_-]{22,128}$/.test(claim.nonce)) deny("OAUTH_UNAVAILABLE", 502);
      const profile = await exchangeOAuthProfile({ provider, env, code, state, deviceId, codeVerifier: claim.codeVerifier, nonce: claim.nonce, fetchImpl });
      const completed = await service(env, fetchImpl, { op: "complete", txId: claim.txId, flowHash: sha(context2.flow), profile });
      if (!/^nxs_[A-Za-z0-9_-]{43}$/.test(completed.sessionSecret || "")) deny("OAUTH_UNAVAILABLE", 502);
      return reply6(res, 303, null, [sessionCookie(completed.sessionSecret), flowCookie("", 0)], { location: GATEWAY_ORIGIN + (claim.intent === "link" ? "/#nexusLogin=oauth&view=account&tab=security" : "/#nexusLogin=oauth") });
    } catch (error2) {
      const known = error2 instanceof Rejected;
      const probeReason = known && error2.code === "INGRESS_REJECTED" && INGRESS_PROBE_REASONS.has(error2.probeReason) && syntheticIngressProbe(req) ? error2.probeReason : null;
      const status = known ? error2.status : error2.message === "PROVIDER_REJECTED" ? 401 : 502, code = known ? error2.code : error2.message === "PROVIDER_REJECTED" ? "PROVIDER_REJECTED" : "OAUTH_UNAVAILABLE", cookies2 = callback ? [flowCookie("", 0)] : [];
      if (callback && htmlCallbackError(req, res, status, code, cookies2)) return true;
      return reply6(res, status, { error: { code, ...probeReason ? { probeReason } : {} } }, cookies2);
    }
  };
}

// server-access/avatar-codec.mjs
var import_jpeg_js = __toESM(require_jpeg_js(), 1);
import { Buffer as Buffer2 } from "node:buffer";
var AvatarError = class extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
};
var deny2 = (code, status) => {
  throw new AvatarError(code, status);
};
var MAX_JPEG = 98304;
function sanitizeAvatar(value) {
  if (typeof value !== "string" || value.length > MAX_JPEG * 4 / 3 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) deny2("AVATAR_INVALID");
  const input = Buffer2.from(value, "base64");
  if (input.toString("base64") !== value || input.length > MAX_JPEG || input[0] !== 255 || input[1] !== 216) deny2("AVATAR_INVALID");
  let offset = 2, dimensions;
  while (offset < input.length) {
    if (input[offset++] !== 255) deny2("AVATAR_INVALID");
    while (input[offset] === 255) offset++;
    const marker = input[offset++];
    if (marker === 218) break;
    if (marker === 217 || marker === 0 || marker === 216 || marker >= 208 && marker <= 215 || offset + 2 > input.length) deny2("AVATAR_INVALID");
    const length = input.readUInt16BE(offset);
    if (length < 2 || offset + length > input.length) deny2("AVATAR_INVALID");
    if ([192, 193, 194].includes(marker)) {
      if (dimensions || length < 8 || input[offset + 2] !== 8) deny2("AVATAR_INVALID");
      dimensions = { height: input.readUInt16BE(offset + 3), width: input.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  if (!dimensions || dimensions.width !== dimensions.height || ![128, 192, 256].includes(dimensions.width)) deny2("AVATAR_DIMENSIONS");
  let decoded, encoded;
  try {
    decoded = import_jpeg_js.default.decode(input, { useTArray: true, formatAsRGBA: true, tolerantDecoding: false, maxResolutionInMP: 1, maxMemoryUsageInMB: 32 });
    if (decoded.width !== dimensions.width || decoded.height !== dimensions.height) deny2("AVATAR_INVALID");
    encoded = import_jpeg_js.default.encode({ data: decoded.data, width: decoded.width, height: decoded.height }, 80).data;
  } catch (error2) {
    if (error2 instanceof AvatarError) throw error2;
    deny2("AVATAR_INVALID");
  }
  if (encoded.length > MAX_JPEG) deny2("AVATAR_TOO_LARGE", 413);
  return Buffer2.from(encoded).toString("base64");
}

// server-access/bff/account-control.mjs
import { createHash as createHash9, createHmac as createHmac7, randomBytes as randomBytes8 } from "node:crypto";
var INTERNAL5 = "/api/v2/account/internal/control";
var BASE2 = "/api/v2/account/control";
var sha2 = (value) => createHash9("sha256").update(value).digest("hex");
var count4 = (req, name) => {
  if (!Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) return -1;
  let n = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (typeof req.rawHeaders[i] !== "string" || typeof req.rawHeaders[i + 1] !== "string") return -1;
    if (req.rawHeaders[i].toLowerCase() === name) n++;
  }
  return n;
};
var Rejected2 = class extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
};
var fail = (code, status) => {
  throw new Rejected2(code, status);
};
var exact = (o, keys) => !!o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).sort().join(",") === [...keys].sort().join(",");
var id = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
var safeText = (value, max) => typeof value === "string" && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
var safeCodes = /* @__PURE__ */ new Set(["SESSION_REQUIRED", "ACCOUNT_SESSION_CHANGED", "ADMIN_REQUIRED", "ADMIN_FRESH_PASSKEY_REQUIRED", "ADMIN_ACCOUNT_PROTECTED", "INVALID_INPUT", "INVALID_STATE", "RESTORE_WITHOUT_LOGIN_METHOD", "NOT_FOUND", "CONTROL_CONFLICT", "CONTROL_WRITE_UNCONFIRMED", "CONTROL_UNAVAILABLE", "ALPHA_CONTROL_UNAVAILABLE", "ALPHA_ACCESS_CLOSED", "ALPHA_CAPACITY_REACHED", "ALPHA_LIMIT_BELOW_OCCUPIED", "REMOVE_BEFORE_PURGE", "PURGE_NOT_ENABLED", "PURGE_SCHEMA_REVIEW_REQUIRED", "SHARED_PROJECT_TRANSFER_REQUIRED", "PURGE_EXTERNAL_STORAGE_REVIEW_REQUIRED", "PURGE_APPROVAL_REJECTED", "PURGE_CONFIRMATION_REQUIRED", "AVATAR_INVALID", "AVATAR_DIMENSIONS", "AVATAR_TOO_LARGE", "USERNAME_UNAVAILABLE", "RATE_LIMITED"]);
var reply7 = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(data), "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" });
  res.end(data);
  return true;
};
async function bounded(stream) {
  const chunks = [];
  let size = 0;
  for await (const b of stream) {
    const bytes = Buffer.from(b);
    size += bytes.length;
    if (size > 262144) fail("INPUT_TOO_LARGE", 413);
    chunks.push(bytes);
  }
  let text4, value;
  try {
    text4 = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, size));
    value = JSON.parse(text4);
  } catch {
    fail("INVALID_INPUT");
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || text4 !== JSON.stringify(value)) fail("INVALID_INPUT");
  return value;
}
function validateDTO(data, path, expected) {
  const valid = () => fail("CONTROL_UNAVAILABLE", 502);
  if (path === "/api/v2/account/profile" || path.startsWith("/api/v2/account/profile/avatar")) {
    if (!exact(data, ["accountId", "username", "displayName", "avatar", "avatarVersion"]) || data.accountId !== expected || !safeText(data.displayName, 512) || data.username !== null && !/^[a-z][a-z0-9._-]{2,31}$/.test(data.username) || !Number.isInteger(data.avatarVersion) || data.avatarVersion < 0 || data.avatar !== null && (typeof data.avatar !== "string" || data.avatar.length > 131100 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.avatar))) valid();
  } else if (path === BASE2 + "/capabilities") {
    if (!exact(data, ["canManage", "canModerate", "canPurge", "freshPasskey"]) || Object.values(data).some((v) => typeof v !== "boolean")) valid();
  } else if (path.startsWith(BASE2 + "/users?") || path === BASE2 + "/users") {
    if (!exact(data, ["users", "total", "offset", "settings", "counts"]) || !Array.isArray(data.users) || data.users.length > 50 || !Number.isInteger(data.total) || !Number.isInteger(data.offset) || !exact(data.settings, ["registrationMode", "maxTesters", "limitEnabled", "version"]) || !exact(data.counts, ["active", "occupied", "reserved"]) || typeof data.settings.limitEnabled !== "boolean" || !["open", "invite_only"].includes(data.settings.registrationMode) || !Number.isInteger(data.settings.maxTesters) || data.settings.maxTesters < 1 || data.settings.maxTesters > 1e4 || !Number.isInteger(data.settings.version) || data.settings.version < 1 || Object.values(data.counts).some((v) => !Number.isInteger(v) || v < 0)) valid();
    for (const u of data.users) if (!exact(u, ["accountId", "username", "displayName", "state", "version", "createdAt", "lastLoginAt", "activeSessions", "reason", "protected"]) || !id(u.accountId) || !safeText(u.displayName, 512) || u.username !== null && !safeText(u.username, 32) || !["active", "blocked", "removed", "invited", "unadmitted", "administrator"].includes(u.state) || !Number.isInteger(u.version) || !Number.isInteger(u.activeSessions) || typeof u.protected !== "boolean" || !safeText(u.reason, 200)) valid();
  } else if (path === BASE2 + "/content" && !exact(data, ["ok"])) {
    if (!exact(data, ["posts", "home"]) || !Array.isArray(data.posts) || data.posts.length > 100 || !exact(data.home, ["draft", "published", "version"])) valid();
    const bounded2 = (v, max) => typeof v === "string" && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
    const article = (v) => exact(v, ["title", "summary", "body"]) && bounded2(v.title, 160) && bounded2(v.summary, 500) && bounded2(v.body, 2e4);
    for (const key of ["draft", "published"]) if (!data.home[key] || typeof data.home[key] !== "object" || Array.isArray(data.home[key]) || Object.entries(data.home[key]).some(([k, v]) => !Object.hasOwn(HOME_SLOTS, k) || !bounded2(v, HOME_SLOTS[k].max))) valid();
    if (!Number.isInteger(data.home.version) || data.home.version < 1) valid();
    for (const post of data.posts) if (!exact(post, ["id", "slug", "draft", "published", "state", "version", "publishedAt"]) || !id(post.id) || !safeText(post.slug, 80) || !["draft", "published", "archived"].includes(post.state) || !Number.isInteger(post.version) || !article(post.draft) || post.published !== null && !article(post.published) || post.publishedAt !== null && !safeText(post.publishedAt, 64)) valid();
  } else if (path === BASE2 + "/audit") {
    if (!exact(data, ["events"]) || !Array.isArray(data.events) || data.events.length > 100) valid();
    for (const e of data.events) if (!exact(e, ["action", "targetId", "createdAt"]) || !safeText(e.action, 32) || e.targetId !== null && !id(e.targetId) || !safeText(e.createdAt, 64)) valid();
  } else if (path === BASE2 + "/invites") {
    if (!exact(data, ["ok", "accountId", "invitationToken", "expiresAt"]) || data.ok !== true || !id(data.accountId) || !/^npi_[A-Za-z0-9_-]{43}$/.test(data.invitationToken) || !safeText(data.expiresAt, 64)) valid();
  } else if (path.endsWith("/purge-preview")) {
    if (!exact(data, ["approvalToken", "expiresAt", "counts", "confirmation", "serverDataOnly"]) || !/^npa_[A-Za-z0-9_-]{43}$/.test(data.approvalToken) || !safeText(data.expiresAt, 64) || !safeText(data.confirmation, 180) || data.serverDataOnly !== true || !exact(data.counts, ["projects", "workspaces", "feedback", "keys", "providers"]) || Object.values(data.counts).some((v) => !Number.isInteger(v) || v < 0)) valid();
  } else if (path.endsWith("/purge")) {
    if (!exact(data, ["ok", "deletedServerData", "localCopiesRemotelyErased"]) || data.ok !== true || data.deletedServerData !== true || data.localCopiesRemotelyErased !== false) valid();
  } else if (path === BASE2 + "/providers") {
    if (!exact(data, ["authorized"]) || data.authorized !== true) valid();
  } else if (!exact(data, ["ok"]) || data.ok !== true) valid();
  return data;
}
async function service2(env, fetchImpl, envelope) {
  const body = JSON.stringify(envelope), timestamp = String(Date.now()), nonce = randomBytes8(16).toString("hex");
  const signature = createHmac7("sha256", env.ADMIN_SERVICE_KEY).update(["v1", "POST", INTERNAL5, timestamp, nonce, sha2(body)].join("\n")).digest("hex");
  const upstream = await fetchImpl(WORKER_ORIGIN + INTERNAL5, { method: "POST", credentials: "omit", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12e3), headers: { accept: "application/json", "content-type": "application/json", "x-nexus-service-timestamp": timestamp, "x-nexus-service-nonce": nonce, "x-nexus-service-signature": signature }, body });
  if (upstream.redirected || !/^application\/json(?:\s*;|$)/i.test(upstream.headers.get("content-type") || "") || upstream.headers.has("set-cookie") || upstream.headers.get("cache-control") !== "no-store" || !hasVaryWildcard(upstream.headers.get("vary"))) {
    await upstream.body?.cancel();
    fail("CONTROL_UNAVAILABLE", 502);
  }
  const data = await bounded(upstream.body);
  if (upstream.status !== 200) fail(safeCodes.has(data.error?.code) ? data.error.code : "CONTROL_UNAVAILABLE", [400, 401, 403, 404, 409, 413, 429, 503].includes(upstream.status) ? upstream.status : 502);
  return data;
}
function createAccountControlHandler({ env = {}, fetchImpl = fetch } = {}) {
  return async (req, res) => {
    if (typeof req.url !== "string" || !/^\/api\/v2\/account\/(?:control(?:\/|\?|$)|profile(?:\/|\?|$))/.test(req.url)) return false;
    try {
      if (env.ACCOUNT_CONTROL_PROXY_ENABLED !== "true" || env.PRIVATE_GATEWAY_CONFIRMED !== "true" || typeof env.ADMIN_SERVICE_KEY !== "string" || env.ADMIN_SERVICE_KEY.length < 32) fail("CONTROL_UNAVAILABLE", 503);
      if (req.url.length > 512) fail("INVALID_INPUT");
      const url = new URL(req.url, GATEWAY_ORIGIN), path = url.pathname;
      if (url.hash || req.url.split("?")[0] !== path || !["GET", "POST"].includes(req.method) || path.startsWith("/api/v2/account/profile") && url.search) fail("INVALID_INPUT");
      if (req.headers.host !== new URL(GATEWAY_ORIGIN).host || count4(req, "host") !== 1 || count4(req, "authorization") !== 0 || req.headers.origin !== void 0 && req.headers.origin !== GATEWAY_ORIGIN || req.headers["sec-fetch-site"] !== void 0 && req.headers["sec-fetch-site"] !== "same-origin") fail("ORIGIN_REJECTED", 403);
      const expected = req.headers["x-nexus-account-expectation"];
      if (count4(req, "x-nexus-account-expectation") !== 1 || !id(expected)) fail("ACCOUNT_EXPECTATION_REQUIRED", 400);
      if (req.method === "POST" && (req.headers.origin !== GATEWAY_ORIGIN || count4(req, "origin") !== 1 || req.headers["content-type"] !== "application/json" || count4(req, "content-type") !== 1 || req.headers["x-nexus-account-control"] !== "1" || count4(req, "x-nexus-account-control") !== 1)) fail("WRITE_ORIGIN_REQUIRED", 403);
      const cookies2 = readV2CookieContext(req, "accountControlContract", { env });
      if (!cookies2) fail("INGRESS_REJECTED", 401);
      const session = cookies2.get("__Host-nexus_session");
      if (!session) fail("SESSION_REQUIRED", 401);
      if (!/^nxs_[A-Za-z0-9_-]{24,256}$/.test(session)) fail("INGRESS_REJECTED", 401);
      const payload = req.method === "POST" ? await bounded(req) : null;
      let prepared = payload;
      if (path === "/api/v2/account/profile/avatar" && req.method === "POST") {
        if (!exact(payload, ["requestId", "version", "jpegBase64"])) fail("INVALID_INPUT");
        const before = await service2(env, fetchImpl, { path: "/api/v2/account/profile", method: "GET", payload: null, sessionHash: sha2(session), expectedAccountId: expected });
        validateDTO(before, "/api/v2/account/profile", expected);
        if (before.avatarVersion !== payload.version) fail("CONTROL_CONFLICT", 409);
        try {
          prepared = { ...payload, jpegBase64: sanitizeAvatar(payload.jpegBase64) };
        } catch (error2) {
          if (error2 instanceof AvatarError) fail(error2.code, error2.status);
          throw error2;
        }
      }
      const data = await service2(env, fetchImpl, { path: req.url, method: req.method, payload: prepared, sessionHash: sha2(session), expectedAccountId: expected });
      const dto = validateDTO(data, req.url, expected);
      if (path === BASE2 + "/providers") {
        const configured = new Set(configuredOAuthProviders(env).map((p) => p.id));
        return reply7(res, 200, { providers: [["yandex", "\u042F\u043D\u0434\u0435\u043A\u0441 ID", ["YANDEX_CLIENT_ID", "YANDEX_CLIENT_SECRET"]], ["google", "Google", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]], ["vk", "VK ID", ["VK_CLIENT_ID"]]].map(([id2, label, names]) => ({ id: id2, label, configured: configured.has(id2), missing: names.filter((n) => typeof env[n] !== "string" || !env[n] || /[\x00-\x20\x7f]/.test(env[n])), callbackURL: oauthCallbackURL(id2) })) });
      }
      return reply7(res, 200, dto);
    } catch (error2) {
      return reply7(res, error2 instanceof Rejected2 ? error2.status : error2.message === "INGRESS_REJECTED" ? 401 : 502, { error: { code: error2 instanceof Rejected2 ? error2.code : error2.message === "INGRESS_REJECTED" ? "INGRESS_REJECTED" : "CONTROL_UNAVAILABLE" } });
    }
  };
}

// server-access/bff/server.mjs
var passkey = createPasskeyHandler({ env: process.env });
var existing = createCombinedHandler({ env: process.env });
var landingBody = readFileSync(new URL("../public/entry.html", import.meta.url));
var entryGate = createEntryGateHandler({ env: process.env, landingBody });
var cloud = createCloudSessionHandler({ env: process.env });
var oauth = createOAuthHandler({ env: process.env });
var control = createAccountControlHandler({ env: process.env });
var content = createContentHandler({ env: process.env });
var assets = /* @__PURE__ */ new Map([
  ["/account/entry/", ["text/html; charset=utf-8", landingBody]],
  ["/account/entry/entry.css", ["text/css; charset=utf-8", readFileSync(new URL("../public/entry.css", import.meta.url))]],
  ["/account/entry/entry.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/entry.js", import.meta.url))]],
  ["/account/entry/galaxy.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/galaxy.js", import.meta.url))]],
  ["/account/entry/oauth-client.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/oauth-client.js", import.meta.url))]],
  ["/account/access/", ["text/html; charset=utf-8", readFileSync(new URL("../public/index.html", import.meta.url))]],
  ["/account/access/page.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/page.js", import.meta.url))]],
  ["/account/access/passkey-client.js", ["text/javascript; charset=utf-8", readFileSync(new URL("../public/passkey-client.js", import.meta.url))]]
]);
var server = http.createServer({ maxHeaderSize: 16384 }, async (req, res) => {
  res.setHeader("vary", "*");
  try {
    if (await entryGate(req, res)) return;
    if (await content(req, res)) return;
    if (await control(req, res)) return;
    if (await cloud(req, res)) return;
    if (await oauth(req, res)) return;
    if (req.url?.startsWith("/api/v2/account/passkey/")) return await passkey(req, res);
    if (req.url === "/account/entry") req.url = "/account/entry/";
    if (req.url === "/account/access") req.url = "/account/access/";
    if (assets.has(req.url)) {
      const [contentType, content2] = assets.get(req.url);
      if (req.method !== "GET" || process.env.PASSKEY_PROXY_ENABLED !== "true" || req.headers.host !== new URL(process.env.PASSKEY_ORIGIN).host) {
        res.writeHead(404, { "cache-control": "no-store", "vary": "*" });
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": contentType, "cache-control": "no-store", "vary": "*", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'", "permissions-policy": "publickey-credentials-create=(self), publickey-credentials-get=(self)" });
      res.end(content2);
      return;
    }
    await existing(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(500, { "cache-control": "no-store", "vary": "*" });
    res.end();
  }
});
server.requestTimeout = 15e3;
server.headersTimeout = 1e4;
server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5e3).unref();
});
