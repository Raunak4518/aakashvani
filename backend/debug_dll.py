import os
import sys

print("Python executable:", sys.executable)
print("Python version:", sys.version)

try:
    print("Importing torch...")
    import torch
    print("Torch version:", torch.__version__)
    print("CUDA available:", torch.cuda.is_available())
    
    print("Importing torchaudio...")
    import torchaudio
    print("Torchaudio version:", torchaudio.__version__)
    
    print("Importing transformers...")
    import transformers
    print("Transformers version:", transformers.__version__)

    print("Importing backend modules...")
    sys.path.append(os.getcwd())
    from modules.inference.arch import AntiSpoofModel
    print("AntiSpoofModel imported.")
    
    print("Instantiating model...")
    model = AntiSpoofModel()
    print("Model instantiated.")
    
    dummy_input = torch.randn(1, 16000*4)
    print("Running forward pass...")
    model(dummy_input)
    print("Forward pass successful.")

except Exception as e:
    print(f"CRASHED: {e}")
    import traceback
    traceback.print_exc()
