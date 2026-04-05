import os
import glob

def init_path(checkpoint_dir, config_dir, size=512, old_version=False, preprocess='crop'):

    # Inside def init_path(...):

    # Force SadTalker to always use safetensor paths unless --old_version is explicitly used
    if old_version:
        sadtalker_paths = {
            'wav2lip_checkpoint' : os.path.join(checkpoint_dir, 'wav2lip.pth'),
            'audio2pose_checkpoint' : os.path.join(checkpoint_dir, 'auido2pose_00140-model.pth'),
            'audio2exp_checkpoint' : os.path.join(checkpoint_dir, 'auido2exp_00300-model.pth'),
            'free_view_checkpoint' : os.path.join(checkpoint_dir, 'facevid2vid_00189-model.pth.tar'),
            'path_of_net_recon_model' : os.path.join(checkpoint_dir, 'epoch_20.pth')
        }
        use_safetensor = False
        print("Running old version due to --old_version flag.")
    else:
        print('using safetensor as default (forced by manual edit in init_path.py)')
        sadtalker_paths = {
            # The main SadTalker model (contains recon, etc.)
            "checkpoint": os.path.join(checkpoint_dir, 'SadTalker_V0.0.2_' + str(size) + '.safetensors'),

            # Wav2Lip model (still a .pth file, download from SadTalker releases if missing)
            'wav2lip_checkpoint' : os.path.join(checkpoint_dir, 'wav2lip.pth'), 

            # Mapping networks (still .pth.tar files)
            'mappingnet_checkpoint_109': os.path.join(checkpoint_dir, 'mapping_00109-model.pth.tar'),
            'mappingnet_checkpoint_229': os.path.join(checkpoint_dir, 'mapping_00229-model.pth.tar'),
        }
        use_safetensor = True

    sadtalker_paths['dir_of_BFM_fitting'] = os.path.join(config_dir)
    sadtalker_paths['audio2pose_yaml_path'] = os.path.join(config_dir, 'auido2pose.yaml')
    sadtalker_paths['audio2exp_yaml_path'] = os.path.join(config_dir, 'auido2exp.yaml')
    sadtalker_paths['use_safetensor'] = use_safetensor # This ensures the flag is set correctly for other modules

    # The 'checkpoint_dir' itself might be useful in other modules, so let's add it.
    sadtalker_paths['checkpoint_dir'] = checkpoint_dir 

    if 'full' in preprocess:
        sadtalker_paths['mappingnet_checkpoint'] = sadtalker_paths['mappingnet_checkpoint_109']
        sadtalker_paths['facerender_yaml'] = os.path.join(config_dir, 'facerender_still.yaml')
    else:
        sadtalker_paths['mappingnet_checkpoint'] = sadtalker_paths['mappingnet_checkpoint_229']
        sadtalker_paths['facerender_yaml'] = os.path.join(config_dir, 'facerender.yaml')

    print(f"DEBUG: init_path is about to return sadtalker_paths: {sadtalker_paths}")
    return sadtalker_paths