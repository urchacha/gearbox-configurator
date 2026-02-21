/** 감속기 시리즈 → 이미지 파일명 매핑 (public/photo/ 기준) */
export const SERIES_PHOTOS: Record<string, string[]> = {
  GPB:  ['GPB.png'],
  GPBR: ['GPBR.png'],
  GPD:  ['GPD.png'],
  GPDR: ['GPDR.png'],
  GPE:  ['GPE.png'],
  GPER: ['GPER.png'],
  GPF:  ['GPF.png'],
  GPFR: ['GPFR.png'],
  GPL:  ['GPL.png'],
  GPLR: ['GPLR.png'],
  GPV:  ['GPV.png'],
  GPVR: ['GPVR.png'],
  GR:   ['GR.png'],
  GSA:  ['GSA.png', 'GSAM.png', 'GSA_small.png'],
  GSB:  ['gsb.png', 'gsb_v.png'],
  GSG:  ['GSG.png', 'GSGM.png', 'GSGZ.png', 'GSGZ-L.png', 'GSGZ-R.png'],
  GSH:  ['GSH.png'],
  GSHR: ['GSHR.png', 'GSHR_h.png', 'GSHR_v.png'],
  GSN:  ['gsn.png', 'gsn_v.png'],
  GSR:  ['GSR.png', 'GSR2.png'],
  GSZ:  ['GSGZ.png', 'GSGZ-L.png', 'GSGZ-R.png'],
  GYH:  ['GYH.png'],
};

export function getSeriesPhotos(series: string): string[] {
  return (SERIES_PHOTOS[series] ?? []).map((f) => `${import.meta.env.BASE_URL}photo/${f}`);
}
