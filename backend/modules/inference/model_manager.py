import torch
import os
import logging

logger = logging.getLogger("uvicorn")

class ModelManager:
    """Handles model lifecycle and optimization"""
    
    def __init__(self, model_path="best_model.pt"):
        self.model_path = model_path
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def load_model(self):
        """Loads the model from disk"""
        try:
            if not os.path.exists(self.model_path):
                 # Fallback for development if file missing
                 logger.warning(f"Model file {self.model_path} not found. Using Mock Model.")
                 self.model = MockModel() 
                 return

            logger.info(f"Loading model from {self.model_path} to {self.device}")
            # Assuming it's a scripted module or similar. Adjust for specific architecture if known.
            # Using torch.jit.load for safety if it's a PT file, or standard load
            try:
                self.model = torch.jit.load(self.model_path, map_location=self.device)
            except:
                # Fallback: maybe it's a state dict or direct object
                self.model = torch.load(self.model_path, map_location=self.device)
                
            self.model.eval()
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = MockModel()

    def predict(self, input_tensor):
        """Runs inference"""
        if self.model is None:
            self.load_model()
            
        with torch.no_grad():
            return self.model(input_tensor.to(self.device))

class MockModel:
    """Fallback model for testing without weight file"""
    def __call__(self, x):
        import random
        # Return fake prob
        # Output shape matching what we expect (e.g. [batch, 1] prob)
        return torch.tensor([[random.random()]])
