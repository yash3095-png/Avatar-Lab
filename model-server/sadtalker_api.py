# your_project/model-server/sadtalker_api.py

import os
import subprocess
import logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse # Import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SADTALKER_NEW_DIR = "C:\\Users\\mhrus\\Avatar_lab\\model-server\\sadtalker-new"
TEMP_UPLOAD_DIR = "C:\\Users\\mhrus\\Avatar_lab\\model-server\\temp_uploads"
TEMP_AUDIO_OUTPUTS_DIR = "C:\\Users\\mhrus\\Avatar_lab\\model-server\\temp_audio_outputs"
SADTALKER_OUTPUTS_DIR = "C:\\Users\\mhrus\\Avatar_lab\\model-server\\outputs_sadtalker" # Define this for clarity

os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_AUDIO_OUTPUTS_DIR, exist_ok=True)
os.makedirs(SADTALKER_OUTPUTS_DIR, exist_ok=True) # Ensure outputs directory exists

@app.post("/generate_sadtalker/")
async def generate_sadtalker_video(
    image_file: UploadFile = File(...),
    synthesized_audio_path: str = Form(...)
):
    logger.info(f"Received request for SadTalker video generation.")
    logger.info(f"Synthesized Audio Path received: {synthesized_audio_path}")

    image_path = os.path.join(TEMP_UPLOAD_DIR, image_file.filename)
    try:
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image_file.file, buffer)
        logger.info(f"Image saved temporarily to: {image_path}")
    except Exception as e:
        logger.error(f"Failed to save image file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save image file: {e}")

    full_audio_path = os.path.join(TEMP_AUDIO_OUTPUTS_DIR, os.path.basename(synthesized_audio_path))
    if not os.path.exists(full_audio_path):
        logger.error(f"Audio file not found at: {full_audio_path}")
        raise HTTPException(status_code=400, detail=f"Audio file not found at: {full_audio_path}. Expected from StyleTTS2.")
    logger.info(f"Using audio file: {full_audio_path}")

    python_executable = os.path.join("C:", os.sep, "Users", "mhrus", "Avatar_lab", "model-server", "venv_sadtalker", "Scripts", "python.exe")
    inference_script = os.path.join(SADTALKER_NEW_DIR, "inference.py")

    # Use the pre-defined SADTALKER_OUTPUTS_DIR
    output_dir = SADTALKER_OUTPUTS_DIR
    os.makedirs(output_dir, exist_ok=True)
    video_filename_base = os.path.splitext(os.path.basename(image_path))[0] + "_" + os.path.splitext(os.path.basename(full_audio_path))[0]
    result_dir = os.path.join(output_dir, video_filename_base)

    sadtalker_command = [
        python_executable,
        inference_script,
        "--driven_audio", full_audio_path,
        "--source_image", image_path,
        "--result_dir", result_dir,
        "--still",
    ]
    
    # ... (rest of sadtalker_api.py code before the try block)

    logger.info(f"Running SadTalker command: {' '.join(sadtalker_command)}")

    try:
        process = subprocess.Popen(
            sadtalker_command,
            cwd=SADTALKER_NEW_DIR,
            stdout=subprocess.PIPE, # Capture stdout
            stderr=subprocess.STDOUT, # Redirect stderr to stdout
            text=True, # Decode as text
            bufsize=1 # Line-buffered output
        )

        # *** THIS IS THE KEY PART THAT WAS MISSING IN YOUR LATEST FILE ***
        all_output_lines = []
        # Read and print output line by line, and collect them
        for line in process.stdout:
            logger.info(f"SadTalker Output: {line.strip()}")
            all_output_lines.append(line.strip())

        process.wait() # Wait for the process to complete

        if process.returncode != 0:
            error_message = f"SadTalker process exited with non-zero status {process.returncode}. Full output:\n{' '.join(all_output_lines)}"
            logger.error(error_message)
            raise HTTPException(status_code=500, detail=f"SADTalker video generation failed: {error_message}")

        # Find the final video path from the collected output lines
        final_video_path = None
        for line in reversed(all_output_lines): # Search from the end for efficiency
            # Check for the specific line indicating the final generated video name
            if line.startswith("The generated video is named:"):
                # Extract the path after the prefix
                path_from_log = line.split("The generated video is named:")[1].strip()
                # SadTalker sometimes includes a trailing slash or uses different slashes, normalize and clean
                final_video_path = os.path.normpath(path_from_log)
                break # Found the path, exit loop

        if not final_video_path or not os.path.exists(final_video_path):
            logger.error(f"Could not find or verify final MP4 video path from SadTalker output.")
            logger.error(f"Attempted path: {final_video_path}")
            logger.error(f"Full SadTalker output for debugging:\n{' '.join(all_output_lines)}")
            raise HTTPException(status_code=500, detail="SADTalker did not produce a verifiable MP4 video at the expected path.")
        # *** END OF KEY PART ***

        logger.info(f"SadTalker video generated successfully at: {final_video_path}")

        # Clean up temporary image file
        try:
            os.remove(image_path)
            logger.info(f"Cleaned up temporary image file: {image_path}")
        except OSError as e:
            logger.warning(f"Could not remove temporary image file {image_path}: {e}")

        # Return the actual file using FileResponse
        return FileResponse(
            path=final_video_path,
            media_type="video/mp4", # Specify the correct MIME type for video
            filename=os.path.basename(final_video_path) # Suggest a filename for download
        )

    except HTTPException: # Re-raise FastAPI's HTTPExceptions
        raise
    except Exception as e:
        logger.error(f"Error during SadTalker generation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error during SadTalker generation: {e}")