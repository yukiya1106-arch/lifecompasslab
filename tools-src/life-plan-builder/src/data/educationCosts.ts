/**
 * 教育費の標準値データ
 * 
 * 出典：文部科学省「子供の学習費調査（令和3年度）」
 * 　　　日本政策金融公庫「教育費負担の実態調査（令和3年度）」
 * 基準年：2021-2022年
 */

import { EducationCostsMaster } from '../types/lifeplan';

export const defaultEducationCostsMaster: EducationCostsMaster = {
  lastUpdated: "2024-04-01",
  source: "文部科学省「子供の学習費調査（令和3年度）」および日本政策金融公庫「教育費負担の実態調査」",
  baseYear: 2021,
  stages: {
    nursery: {
      publicAnnual: 30,  // 公立・認可保育園 年間保育料等 (万円)
      privateAnnual: 50, // 私立・認可外保育園 年間保育料等 (万円)
      durationYears: 3,  // 3年 (0歳〜2歳)
      entranceAge: 0,
    },
    kindergarten: {
      publicAnnual: 17,  // 公立幼稚園 年間学習費 (万円)
      privateAnnual: 31, // 私立幼稚園 年間学習費 (万円)
      durationYears: 3,  // 3年 (3歳〜5歳)
      entranceAge: 3,
    },
    elementary: {
      publicAnnual: 35,  // 公立小学校 年間学習費 (万円)
      privateAnnual: 167, // 私立小学校 年間学習費 (万円)
      durationYears: 6,  // 6年 (6歳〜11歳)
      entranceAge: 6,
    },
    juniorHigh: {
      publicAnnual: 54,  // 公立中学校 年間学習費 (万円)
      privateAnnual: 144, // 私立中学校 年間学習費 (万円)
      durationYears: 3,  // 3年 (12歳〜14歳)
      entranceAge: 12,
    },
    highSchool: {
      publicAnnual: 51,  // 公立高校 年間学習費 (万円)
      privateAnnual: 105, // 私立高校 年間学習費 (万円)
      durationYears: 3,  // 3年 (15歳〜17歳)
      entranceAge: 15,
    },
    university: {
      publicAnnual: 82,  // 国公立大学 年間学費+入学金等按分 (万円)
      privateAnnual: 136, // 私立文理平均 年間学費+入学金等按分 (万円)
      durationYears: 4,  // 4年 (18歳〜21歳)
      entranceAge: 18,
    },
  },
  universityLivingAwayExtraAnnual: 100, // 大学で自宅外通学する場合の年間仕送り・生活費追加額 (万円)
};
