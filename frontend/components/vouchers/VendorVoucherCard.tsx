import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface VoucherProps {
  voucher: {
    id: string;
    fallback_code: string;
    amount: number;
    status: 'AVAILABLE' | 'REDEEMED' | 'EXPIRED';
    expires_at: string;
    pool_group_name: string;
  };
}

export const VendorVoucherCard: React.FC<VoucherProps> = ({ voucher }) => {
  const isAvailable = voucher.status === 'AVAILABLE';
  
  // The absolute verification route the wholesaler's portal will read upon scanning
  const verificationUrl = `https://chama-cloud.vercel.app/wholesaler/verify/${voucher.id}`;

  // WhatsApp Deep Link Generation (Zero-cost distribution)
  const shareMessage = encodeURIComponent(
    `Chama Cloud Voucher for ${voucher.pool_group_name}\n` +
    `Value: KES ${voucher.amount}\n` +
    `Code: ${voucher.fallback_code}\n` +
    `Scan Link: ${verificationUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareMessage}`;

  return (
    <div className="max-w-md mx-auto my-6 bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6 text-center">
        <span className="text-xs uppercase tracking-wider font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
          {voucher.pool_group_name} Stock Token
        </span>
        
        <div className="my-6 flex justify-center p-4 bg-gray-50 rounded-xl inline-block mx-auto">
          {isAvailable ? (
            <QRCodeSVG value={verificationUrl} size={180} includeMargin={true} />
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-200 text-gray-400 font-bold rounded">
              {voucher.status}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-gray-400 text-xs uppercase tracking-widest">Manual Alphanumeric Code</p>
          <p className="text-2xl font-mono font-bold tracking-wider text-gray-800">{voucher.fallback_code}</p>
        </div>

        <hr className="my-5 border-gray-100" />

        <div className="flex justify-between items-center px-2">
          <div className="text-left">
            <p className="text-xs text-gray-400">Voucher Value</p>
            <p className="text-xl font-bold text-emerald-600">KES {voucher.amount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Status</p>
            <p className={`text-sm font-semibold ${isAvailable ? 'text-blue-600' : 'text-gray-500'}`}>
              {voucher.status}
            </p>
          </div>
        </div>

        {isAvailable && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-xl transition duration-150 shadow-md shadow-emerald-100"
          >
            Share to WhatsApp
          </a>
        )}
      </div>
    </div>
  );
};