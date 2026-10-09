import featuredImg from "../../assets/featured.webp";
import loginImg from "../../assets/login.webp";
import mensCollectionImg from "../../assets/mens-collection.webp";
import rabbitHeroImg from "../../assets/rabbit-hero.webp";
import registerImg from "../../assets/register.webp";
import womensCollectionImg from "../../assets/womens-collection.webp";

export const featured = featuredImg.src;
export const login = loginImg.src;
export const mensCollection = mensCollectionImg.src;
export const rabbitHero = rabbitHeroImg.src;
export const register = registerImg.src;
export const womensCollection = womensCollectionImg.src;

export const assets = { featured, login, mensCollection, rabbitHero, register, womensCollection } as const;
