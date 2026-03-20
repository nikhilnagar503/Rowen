import { useState } from 'react';
import { Settings, X, Key } from 'lucide-react';

interface ApiKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (key: string, provider: 'openai' | 'anthropic') => void;
	currentProvider: 'openai' | 'anthropic';
}

const getStoredKey = (provider: 'openai' | 'anthropic') => {
	if (typeof window === 'undefined') {
		return '';
	}

	const storageKey = provider === 'anthropic' ? 'csvhero_anthropic_key' : 'csvhero_openai_key';
	return localStorage.getItem(storageKey) || '';
};

export default function ApiKeyModal({ isOpen, onClose, onSave, currentProvider }: ApiKeyModalProps) {
	const [keysByProvider, setKeysByProvider] = useState<Record<'openai' | 'anthropic', string>>(() => ({
		openai: getStoredKey('openai'),
		anthropic: getStoredKey('anthropic'),
	}));
	const [provider, setProvider] = useState<'openai' | 'anthropic'>(currentProvider);
	const [apiKey, setApiKey] = useState(keysByProvider[currentProvider] || '');

	if (!isOpen) return null;

	const handleSave = () => {
		const storageKey = provider === 'anthropic' ? 'csvhero_anthropic_key' : 'csvhero_openai_key';
		localStorage.setItem(storageKey, apiKey);
		setKeysByProvider((prev) => ({ ...prev, [provider]: apiKey }));
		onSave(apiKey, provider);
		onClose();
	};

	const selectedLabel = provider === 'anthropic' ? 'Anthropic API Key' : 'OpenAI API Key';
	const selectedLink = provider === 'anthropic'
		? 'https://console.anthropic.com/settings/keys'
		: 'https://platform.openai.com/api-keys';

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
			<div className="glass w-full max-w-md rounded-2xl border border-white/15 p-6 shadow-2xl">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Settings className="h-5 w-5 text-cyan-200" />
						<h2 className="text-lg font-semibold text-white">Connect Provider</h2>
					</div>
					<button onClick={onClose} className="text-slate-500 transition-colors hover:text-slate-200">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="mb-4 rounded-lg border border-cyan-300/25 bg-cyan-400/10 p-3">
					<p className="text-xs text-cyan-100">Choose your model provider, then add an API key stored only in your browser.</p>
				</div>

				<div className="mb-4 grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => {
							setProvider('openai');
							setApiKey(keysByProvider.openai || '');
						}}
						className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
							provider === 'openai'
								? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
								: 'border-white/10 bg-white/[0.03] text-slate-300 hover:text-white'
						}`}
					>
						OpenAI
					</button>
					<button
						type="button"
						onClick={() => {
							setProvider('anthropic');
							setApiKey(keysByProvider.anthropic || '');
						}}
						className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
							provider === 'anthropic'
								? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
								: 'border-white/10 bg-white/[0.03] text-slate-300 hover:text-white'
						}`}
					>
						Anthropic
					</button>
				</div>

				<div className="mb-6">
					<label className="mb-2 block text-sm text-slate-300">
						<Key className="mr-1 inline h-3.5 w-3.5" />
						{selectedLabel}
					</label>
					<input
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						placeholder="sk-..."
						className="w-full rounded-lg border border-white/10 bg-black/35 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-300/50 focus:outline-none"
					/>
					<p className="mt-2 text-xs text-slate-500">
						Your key stays in your browser (localStorage). Never sent to any third party.
					</p>
					<a
						href={selectedLink}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 inline-block text-xs text-cyan-300 transition-colors hover:text-cyan-100"
					>
						Get your API key →
					</a>
				</div>

				<button
					onClick={handleSave}
					disabled={!apiKey.trim()}
					className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Save & Connect
				</button>
			</div>
		</div>
	);
}
