Pod::Spec.new do |s|
  s.name           = 'CyphixBle'
  s.version        = '0.1.0'
  s.summary        = 'CYPHIX native BLE bridge (CoreBluetooth) for the ESP32 ECG device.'
  s.description    = 'Scans, connects and streams the frozen CYPHIX ECG GATT protocol off the JS thread.'
  s.author         = 'CYPHIX'
  s.homepage       = 'https://cyphix.example'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,swift}"
end
