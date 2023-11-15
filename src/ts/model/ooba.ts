export interface OobaChatCompletionRequestParams {
    mode: 'instruct'|'chat'|'chat-instruct'
    turn_template?: string
    name1_instruct?: string
    name2_instruct?: string
    context_instruct?: string
    system_message?: string
    name1?: string
    name2?: string
    context?: string
    greeting?: string
    chat_instruct_command?: string
    preset?: string; // The '?' denotes that the property is optional
    min_p?: number;
    top_k?: number;
    repetition_penalty?: number;
    repetition_penalty_range?: number;
    typical_p?: number;
    tfs?: number;
    top_a?: number;
    epsilon_cutoff?: number;
    eta_cutoff?: number;
    guidance_scale?: number;
    negative_prompt?: string;
    penalty_alpha?: number;
    mirostat_mode?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    temperature_last?: boolean;
    do_sample?: boolean;
    seed?: number; 
    encoder_repetition_penalty?: number;
    no_repeat_ngram_size?: number;
    min_length?: number;
    num_beams?: number;
    length_penalty?: number;
    early_stopping?: boolean; 
    truncation_length?: number; 
    max_tokens_second?: number; 
    custom_token_bans?: string;
    auto_max_new_tokens?: boolean; 
    ban_eos_token?: boolean; 
    add_bos_token?: boolean; 
    skip_special_tokens?: boolean;
    grammar_string?: string;
    
}