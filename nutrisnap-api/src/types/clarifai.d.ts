declare module 'clarifai' {
  export interface PredictResult { outputs?: any[]; }

  export class ClarifaiClient {
    constructor(options: { apiKey: string });
    models: {
      predict(modelId: string, input: any): Promise<PredictResult>;
    };
  }

  export { ClarifaiClient };
  export default ClarifaiClient;
}
