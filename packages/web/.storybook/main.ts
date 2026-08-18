import type { StorybookConfig } from '@storybook/react-vite';
import { contractsSrcAlias } from '../contracts-src-alias';
import { engineSrcAlias } from '../engine-src-alias';

const config: StorybookConfig = {
  // Two trees only: Primitives/* (judged in isolation) and, later, Play/*
  // (staged over a real map). There are no screen-level stories.
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Storybook dev AND its static build read @questra/contracts and @questra/engine
  // from src, so stories never render against a stale dist.
  viteFinal: async (cfg) => {
    cfg.resolve ??= {};
    cfg.resolve.alias = [
      ...(Array.isArray(cfg.resolve.alias) ? cfg.resolve.alias : []),
      contractsSrcAlias,
      engineSrcAlias,
    ];
    return cfg;
  },
};
export default config;
