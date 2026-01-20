import { useState } from 'react';
import { X } from 'lucide-react';

interface ApprovalModalProps {
    interrupt: {
        type: string;
        interrupt_type: string;
        message: string;
        data: {
            missing_fields?: string[];
            company?: string;
            suggested_hq?: string;
        };
    };
    onApprove: (data: any) => void;
    onReject: () => void;
}

const ApprovalModal = ({ interrupt, onApprove, onReject }: ApprovalModalProps) => {
    const [companyUrl, setCompanyUrl] = useState('');
    const [hqLocation, setHqLocation] = useState('');

    const handleApprove = () => {
        const data: any = {};

        if (interrupt.data.missing_fields?.includes('company_url')) {
            data.company_url = companyUrl;
        }

        if (interrupt.data.missing_fields?.includes('hq_location')) {
            data.hq_location = hqLocation;
        }

        onApprove(data);
    };

    const isMissingData = interrupt.interrupt_type === 'missing_data';
    const isHqValidation = interrupt.interrupt_type === 'validate_hq';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isMissingData ? '📋 Missing Information' : '⚠️ Confirm Location'}
                    </h2>
                    <button
                        onClick={onReject}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Message */}
                <p className="text-gray-600 mb-6">{interrupt.message}</p>

                {/* Form */}
                {isMissingData && (
                    <div className="space-y-4">
                        {interrupt.data.missing_fields?.includes('company_url') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Company Website URL
                                </label>
                                <input
                                    type="text"
                                    value={companyUrl}
                                    onChange={(e) => setCompanyUrl(e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#468BFF] focus:border-transparent"
                                />
                            </div>
                        )}

                        {interrupt.data.missing_fields?.includes('hq_location') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Headquarters Location
                                </label>
                                <input
                                    type="text"
                                    value={hqLocation}
                                    onChange={(e) => setHqLocation(e.target.value)}
                                    placeholder="City, Country"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#468BFF] focus:border-transparent"
                                />
                            </div>
                        )}
                    </div>
                )}

                {isHqValidation && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700">
                            <strong>Suggested HQ:</strong> {interrupt.data.suggested_hq}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Would you like to use this location instead?
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleApprove}
                        className="flex-1 bg-[#468BFF] text-white px-4 py-2 rounded-lg hover:bg-[#3b7aeb] transition-colors font-medium"
                    >
                        {isMissingData ? 'Continue' : 'Confirm'}
                    </button>
                    <button
                        onClick={onReject}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalModal;
