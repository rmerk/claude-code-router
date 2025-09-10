import { RouterFunction } from '../src/types/index.js';

const router: RouterFunction = async function router(req, config) {
  return "deepseek,deepseek-chat";
};

export default router;
