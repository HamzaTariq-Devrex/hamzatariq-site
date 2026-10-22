"use client";

import dynamic from "next/dynamic";
import "@/App.css";
import { LoadingProvider } from "@/context/LoadingProvider";
import MainContainer from "./MainContainer";

const CharacterModel = dynamic(() => import("./Character"), { ssr: false });

const HomeClient = () => (
  <LoadingProvider>
    <MainContainer>
      <CharacterModel />
    </MainContainer>
  </LoadingProvider>
);

export default HomeClient;
